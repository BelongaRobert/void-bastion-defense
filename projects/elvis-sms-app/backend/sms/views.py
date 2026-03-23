from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.http import HttpResponse, JsonResponse
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import json
from .services import send_twilio_message
from datetime import datetime, timedelta
from twilio.rest import Client
import os
from django.views.decorators.csrf import csrf_exempt
from core.redis_clients import get_client
from campaign.models import CampaignContact
from campaign.utils import send_campaign_ws
from .models import Notification
from django.db.models import Count

twilio_client = Client(
    os.getenv("TWILIO_ACCOUNT_SID"),
    os.getenv("TWILIO_AUTH_TOKEN")
)
TWILIO_PHONE_NUMBER=os.getenv("TWILIO_PHONE_NUMBER")

def normalize_phone(phone):
    if not phone:
        return phone
    phone = str(phone).strip()
    if not phone:
        return phone
    if not phone.startswith("+"):
        phone = "+" + phone
    return phone

def map_twilio_status_to_contact_status(raw_status: str | None):
    if not raw_status:
        return raw_status
    status = str(raw_status).strip().lower()
    mapping = {
        "queued": "queued",
        "sending": "queued",
        "accepted": "queued",
        "sent": "sent",
        "delivered": "delivered",
        "failed": "failed",
        "undelivered": "failed",
        "canceled": "failed",
        "cancelled": "failed",
    }
    return mapping.get(status, status)

@csrf_exempt
def incoming_webhook(request):
    print("request.POST", request.POST)
    body = request.POST.get("Body")
    sid = request.POST.get("MessageSid") or request.POST.get("SmsSid")
    status = request.POST.get("MessageStatus") or request.POST.get("SmsStatus")
    print("status", status)
    print("Body", request.POST.get("Body"))
    print(not body and sid and status == "delivered")
    # --- Fetch body from Twilio only if status is delivered and body is missing ---
    if not body and sid and status == "delivered":
        try:
            msg = twilio_client.messages(sid).fetch()
            body = msg.body
            print(f"Fetched body from Twilio for delivered message {sid}: {msg} {body}")
        except Exception as e:
            print(f"Failed to fetch body from Twilio for {sid}: {e}")

    # --- INCOMING SMS ---
    if body:
        print("body ha", body)
        return handle_incoming_sms(request, body)

    # --- STATUS UPDATE ---
    if status:
        return handle_status_update(request)

    # --- UNKNOWN EVENT ---
    print("Unknown Twilio webhook:", request.POST)
    return HttpResponse("Ignored")

def handle_status_update(request):
    sid = request.POST.get("MessageSid") or request.POST.get("SmsSid")
    raw_status = request.POST.get("MessageStatus") or request.POST.get("SmsStatus")
    status = map_twilio_status_to_contact_status(raw_status)
    to = request.POST.get("To")
    
    # Log all webhook data for debugging
    print(f"Status webhook received: {sid} -> {status} for {to}")
    print(f"Full webhook data: {dict(request.POST)}")
    
    # Log specific error details if available
    if status in ['failed', 'undelivered']:
        error_code = request.POST.get("ErrorCode")
        error_message = request.POST.get("ErrorMessage")
        print(f"TWILIO ERROR - Code: {error_code}, Message: {error_message}")
        
        # Additional debugging info
        print(f"Additional webhook fields:")
        for key in ['AccountSid', 'MessageSid', 'SmsSid', 'MessageStatus', 'SmsStatus', 
                   'From', 'To', 'ApiVersion', 'SmsStatus', 'ErrorCode', 'ErrorMessage']:
            value = request.POST.get(key)
            if value:
                print(f"  {key}: {value}")
    
    # Log successful deliveries too for comparison
    elif status in ['delivered', 'sent']:
        print(f"TWILIO SUCCESS - Message {sid} status: {status}")

    to = normalize_phone(to)

    if sid and status:
        CampaignContact.objects.select_related("campaign").filter(
            message_sid=sid
        ).update(status=status)

    contact = None
    if sid:
        contact = CampaignContact.objects.select_related("campaign").filter(
            message_sid=sid
        ).first()

    if contact:
        send_campaign_ws(
            contact.campaign_id,
            {
                "type": "campaign_status",
                "phone": contact.phone,
                "status": status
            }
        )

    channel_name = get_client(to)
    if channel_name:
        channel_layer = get_channel_layer()
        try:
            async_to_sync(channel_layer.send)(
                channel_name,
                {
                    "type": "ws_send",
                    "message": {
                        "type": "status_update",
                        "messageId": sid,
                        "status": status,
                        "timestamp": datetime.utcnow().isoformat()
                    }
                }
            )
        except Exception as e:
            print("Error sending status update:", e)

    return HttpResponse("OK")

def handle_incoming_sms(request, body):
    from_ = request.POST.get("From")
    to = request.POST.get("To")
    sid = request.POST.get("MessageSid")
    status = request.POST.get("MessageStatus")
    error_code = request.POST.get("ErrorCode")

    to = normalize_phone(to)
    from_ = normalize_phone(from_)

    print("han hai body", body)

    # If still no body, ignore this webhook (probably a pure status update)
    if not body:
        return HttpResponse("<Response>Ignored</Response>")

    # Save notification to database
    try:
        Notification.objects.update_or_create(
            message_sid=sid,
            defaults={
                'from_phone': from_,
                'to_phone': to,
                'body': body,
                'timestamp': datetime.utcnow(),
            }
        )
        print(f"Saved notification to database: {sid}")
    except Exception as e:
        print(f"Error saving notification: {e}")

    channel_name = get_client(to)
    if channel_name:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.send)(
            channel_name,
            {
                "type": "ws_send",
                "message": {
                    "type": "message_received",
                    "from": from_,
                    "to": to,
                    "body": body,
                    "messageId": sid,
                    "timestamp": datetime.utcnow().isoformat()
                }
            }
        )
        print(f"Forwarded incoming message to {to} via channel {channel_name}")

    contact = CampaignContact.objects.select_related("campaign").filter(
        phone=from_,
        status__in=["sent", "delivered"]
    ).order_by("id").first()

    if contact and not contact.replied_at:
        contact.replied_at = datetime.utcnow()

        if body in ["stop", "unsubscribe"]:
            contact.status = "opt_out"
        elif body in ["start", "yes"]:
            contact.status = "opt_in"
        else:
            contact.status = "replied"

        contact.save(update_fields=["status", "replied_at"])

        send_campaign_ws(
            contact.campaign_id,
            {
                "type": "campaign_reply",
                "phone": from_,
                "status": contact.status,
                "body": body
            }
        )

    return HttpResponse("<Response>Webhook</Response>")

@csrf_exempt
def status_webhook(request):
    """Handle message status updates from Twilio"""
    return handle_status_update(request)

@api_view(["POST"])
def send_message(request):
    """HTTP API endpoint to send SMS"""
    to = request.data.get("to")
    body = request.data.get("body")
    from_ = request.data.get("from")
    message_id = request.data.get("messageId")

    if not to or not body:
        return Response(
            {"error": 'Missing "to" or "body"'},
            status=400
        )

    to = normalize_phone(to)
    from_ = normalize_phone(from_)
    result = async_to_sync(send_twilio_message)(to, body)

    channel_name = get_client(from_)
    if channel_name:
        channel_layer = get_channel_layer()
        try:
            async_to_sync(channel_layer.send)(
                channel_name,
                {
                    "type": "ws_send",
                    "message": {
                        "type": "sent",
                        "messageId": message_id or f"http-{int(datetime.utcnow().timestamp())}",
                        "twilioSid": result["sid"],
                        "status": result["status"],
                        "timestamp": datetime.utcnow().isoformat()
                    }
                }
            )
        except Exception as e:
            print(f"Error sending WebSocket notification: {e}")

    return Response({
        "success": True,
        "sid": result["sid"],
        "status": result["status"],
        "dateCreated": result.get("dateCreated")
    })

@api_view(["GET"])
def fetch_messages(request):
    """Fetch messages with cursor-based pagination - Better for chat apps"""
    page_size = int(request.GET.get("pageSize", 20))
    phone_number = request.GET.get("phoneNumber")
    contact_number = request.GET.get("contact")
    before_date = request.GET.get("beforeDate")  # Cursor for pagination

    if not phone_number:
        return Response({"error": "phoneNumber is required"}, status=400)

    phone_number = normalize_phone(phone_number)
    if contact_number:
        contact_number = normalize_phone(contact_number)

    try:
        # Common parameters for both directions
        base_params = {
            'limit': page_size + 1,  # Fetch one extra to know if there's more
        }

        if before_date:
            base_params['date_sent_before'] = datetime.fromisoformat(before_date.replace('Z', '+00:00'))

        if contact_number:
            # For 1:1 conversation, we need to combine messages from both directions
            outgoing_messages = []
            incoming_messages = []

            # Get outgoing messages (you → contact)
            outgoing_params = base_params.copy()
            outgoing_params.update({
                'from_': phone_number,
                'to': contact_number,
            })
            outgoing = twilio_client.messages.list(**outgoing_params)
            outgoing_messages = list(outgoing)

            # Get incoming messages (contact → you)
            incoming_params = base_params.copy()
            incoming_params.update({
                'from_': contact_number,
                'to': phone_number,
            })
            incoming = twilio_client.messages.list(**incoming_params)
            incoming_messages = list(incoming)

            # Combine and sort by date (newest first - Twilio's default)
            all_messages = outgoing_messages + incoming_messages
            all_messages.sort(key=lambda x: x.date_sent if x.date_sent else datetime.min, reverse=True)

            # Remove duplicates
            seen_sids = set()
            unique_messages = []
            for msg in all_messages:
                if msg.sid not in seen_sids:
                    seen_sids.add(msg.sid)
                    unique_messages.append(msg)

            # Check if there are more messages
            has_more = len(unique_messages) > page_size

            # Take only the page_size messages
            paginated_messages = unique_messages[:page_size]

            # Get cursor for next page (oldest message's date)
            next_cursor = None
            if paginated_messages and has_more:
                oldest_msg = paginated_messages[-1]
                if oldest_msg.date_sent:
                    next_cursor = oldest_msg.date_sent.isoformat()

            # Reverse for chronological display (oldest first)
            paginated_messages.reverse()

        else:
            # No contact specified - get all messages for this number
            # Get incoming messages
            incoming_params = base_params.copy()
            incoming_params['to'] = phone_number
            incoming = twilio_client.messages.list(**incoming_params)
            incoming_messages = list(incoming)

            # Get outgoing messages
            outgoing_params = base_params.copy()
            outgoing_params['from_'] = phone_number
            outgoing = twilio_client.messages.list(**outgoing_params)
            outgoing_messages = list(outgoing)

            # Combine and sort
            all_messages = incoming_messages + outgoing_messages
            all_messages.sort(key=lambda x: x.date_sent if x.date_sent else datetime.min, reverse=True)

            # Remove duplicates
            seen_sids = set()
            unique_messages = []
            for msg in all_messages:
                if msg.sid not in seen_sids:
                    seen_sids.add(msg.sid)
                    unique_messages.append(msg)

            has_more = len(unique_messages) > page_size
            paginated_messages = unique_messages[:page_size]

            next_cursor = None
            if paginated_messages and has_more:
                oldest_msg = paginated_messages[-1]
                if oldest_msg.date_sent:
                    next_cursor = oldest_msg.date_sent.isoformat()

            # Reverse for chronological display
            paginated_messages.reverse()

        # Process messages
        processed_messages = []
        for m in paginated_messages:
            direction = "inbound" if m.to == phone_number else "outbound"

            processed_messages.append({
                "sid": m.sid,
                "from": m.from_,
                "to": m.to,
                "body": m.body,
                "status": m.status,
                "dateSent": m.date_sent.isoformat() if m.date_sent else None,
                "timestamp": m.date_sent.isoformat() if m.date_sent else datetime.utcnow().isoformat(),
                "direction": direction,
                "isYou": direction == "outbound",
                "price": m.price,
                "priceUnit": m.price_unit,
            })

        return Response({
            "success": True,
            "messages": processed_messages,
            "hasMore": has_more,
            "nextCursor": next_cursor,
            "count": len(processed_messages)
        })

    except Exception as e:
        print(f"Error fetching messages: {str(e)}")
        return Response({
            "success": False,
            "error": str(e),
            "messages": []
        }, status=500)

@api_view(["GET"])
def fetch_conversations(request):
    """Fetch list of recent conversations (grouped by contact)"""
    phone_number = request.GET.get("phoneNumber")
    limit = int(request.GET.get("limit", 50))

    if not phone_number:
        return Response({"error": "phoneNumber is required"}, status=400)

    phone_number = normalize_phone(phone_number)

    try:
        days = request.GET.get("days")
        scan_limit = request.GET.get("scanLimit")
        try:
            days = int(days) if days is not None else 30
        except (TypeError, ValueError):
            days = 30
        if days < 1:
            days = 1
        if days > 3650:
            days = 3650

        try:
            scan_limit = int(scan_limit) if scan_limit is not None else 1000
        except (TypeError, ValueError):
            scan_limit = 1000
        if scan_limit < 100:
            scan_limit = 100
        if scan_limit > 5000:
            scan_limit = 5000

        date_after = datetime.utcnow() - timedelta(days=days)

        # Get all messages involving this phone number
        messages = []

        # Incoming messages
        incoming = twilio_client.messages.list(
            to=phone_number,
            date_sent_after=date_after,
            limit=scan_limit
        )
        messages.extend(list(incoming))

        # Outgoing messages
        outgoing = twilio_client.messages.list(
            from_=phone_number,
            date_sent_after=date_after,
            limit=scan_limit
        )
        messages.extend(list(outgoing))

        by_sid = {}
        for msg in messages:
            if getattr(msg, "sid", None) and msg.sid not in by_sid:
                by_sid[msg.sid] = msg
        messages = list(by_sid.values())

        # Group by contact
        conversations = {}

        # Pre-fetch all CampaignContact records for phone numbers we'll encounter
        contact_phone_numbers = set()
        for msg in messages:
            if msg.to == phone_number:
                contact = msg.from_
            else:
                contact = msg.to
            contact = normalize_phone(contact)
            if contact != phone_number:
                contact_phone_numbers.add(contact)

        unread_counts = {}
        unread_qs = Notification.objects.filter(
            to_phone=phone_number,
            seen=False
        ).values("from_phone").annotate(c=Count("id"))
        for row in unread_qs:
            unread_counts[normalize_phone(row["from_phone"])] = row["c"]

        contact_names = {}
        contact_phone_numbers = list(contact_phone_numbers)
        if contact_phone_numbers:

            # First, get Custom Contacts (highest priority)
            custom_contacts = CampaignContact.objects.filter(
                phone__in=contact_phone_numbers,
                campaign__name="Custom Contacts"
            ).values('phone', 'meta')
            for cc in custom_contacts:
                meta = cc.get('meta', {})
                if isinstance(meta, dict) and meta.get('first_name'):
                    contact_names[normalize_phone(cc['phone'])] = meta['first_name']

            # Then, get other campaign contacts if no custom contact exists
            remaining_phones = [phone for phone in contact_phone_numbers if phone not in contact_names]
            if remaining_phones:
                other_contacts = CampaignContact.objects.filter(
                    phone__in=remaining_phones
                ).exclude(campaign__name="Custom Contacts").values('phone', 'meta')
                for cc in other_contacts:
                    meta = cc.get('meta', {})
                    if isinstance(meta, dict) and meta.get('first_name') and cc['phone'] not in contact_names:
                        contact_names[normalize_phone(cc['phone'])] = meta['first_name']

        for msg in messages:
            # Determine the other party in the conversation
            if msg.to == phone_number:
                contact = msg.from_  # Someone sent you a message
            else:
                contact = msg.to  # You sent someone a message

            contact = normalize_phone(contact)

            if contact == phone_number:
                continue  # Skip if somehow it's the same

            if contact not in conversations:

                conversations[contact] = {
                    "contact": contact,
                    "contactName": contact_names.get(contact, ""),  # Add contact name if available
                    "lastMessage": msg.body[:100] + ("..." if len(msg.body) > 100 else ""),
                    "lastMessageTime": msg.date_sent.isoformat() if msg.date_sent else datetime.utcnow().isoformat(),
                    "lastMessageId": msg.sid,
                    "unreadCount": unread_counts.get(contact, 0),
                    "messageCount": 1,
                    "lastMessageDirection": "inbound" if msg.to == phone_number else "outbound"
                }

            else:
                conversations[contact]["messageCount"] += 1
                # Update if this is a newer message
                current_time = conversations[contact]["lastMessageTime"]
                msg_time = msg.date_sent.isoformat() if msg.date_sent else datetime.utcnow().isoformat()
                if msg_time > current_time:
                    conversations[contact]["lastMessage"] = msg.body[:100] + ("..." if len(msg.body) > 100 else "")
                    conversations[contact]["lastMessageTime"] = msg_time
                    conversations[contact]["lastMessageId"] = msg.sid
                    conversations[contact]["lastMessageDirection"] = "inbound" if msg.to == phone_number else "outbound"

        # Convert to list and sort by last message time
        conversation_list = list(conversations.values())
        conversation_list.sort(key=lambda x: x["lastMessageTime"], reverse=True)

        # Apply limit
        conversation_list = conversation_list[:limit]

        return Response({
            "success": True,
            "count": len(conversation_list),
            "conversations": conversation_list
        })

    except Exception as e:
        print(f"Error fetching conversations: {str(e)}")
        return Response({
            "success": False,
            "error": str(e),
            "conversations": []
        }, status=500)

@api_view(["GET"])
def search_conversations(request):
    """Search conversations by contact phone substring, or by first name if CampaignContact found."""
    phone_number = request.GET.get("phoneNumber")
    q = (request.GET.get("q") or "").strip()
    limit = int(request.GET.get("limit", 20))

    if not phone_number:
        return Response({"error": "phoneNumber is required"}, status=400)
    if not q:
        return Response({"success": True, "count": 0, "conversations": []})

    phone_number = normalize_phone(phone_number)

    try:
        # First, check if q matches a CampaignContact's first_name
        campaign_contact = CampaignContact.objects.filter(
            meta__first_name=q
        ).first()

        target_contact_phone = None
        if campaign_contact:
            target_contact_phone = normalize_phone(campaign_contact.phone)
            print(f"Found CampaignContact for first_name '{q}': {target_contact_phone}")

        date_after = datetime.utcnow() - timedelta(days=365)

        messages = []

        if target_contact_phone:
            # Search for conversations with the specific contact phone
            incoming = twilio_client.messages.list(
                to=normalize_phone(phone_number),
                from_=target_contact_phone,
                date_sent_after=date_after,
                limit=200
            )

            messages.extend(list(incoming))

            outgoing = twilio_client.messages.list(
                from_=normalize_phone(phone_number),
                to=target_contact_phone,
                date_sent_after=date_after,
                limit=200
            )

            messages.extend(list(outgoing))
        else:
            # Original logic: search by phone substring
            incoming = twilio_client.messages.list(
                to=normalize_phone(phone_number),
                date_sent_after=date_after,
                limit=200
            )

            messages.extend(list(incoming))

            outgoing = twilio_client.messages.list(
                from_=normalize_phone(phone_number),
                date_sent_after=date_after,
                limit=200
            )

            messages.extend(list(outgoing))

        conversations = {}

        # Pre-fetch all CampaignContact records for phone numbers we'll encounter
        contact_phone_numbers = set()
        for msg in messages:
            if msg.to == phone_number:
                contact = msg.from_
            else:
                contact = msg.to
            contact = normalize_phone(contact)
            if contact and contact != phone_number:
                if target_contact_phone:
                    # If searching for specific contact, only include that one
                    if contact == target_contact_phone:
                        contact_phone_numbers.add(contact)
                else:
                    # Original logic: check substring match
                    if q in (contact or ""):
                        contact_phone_numbers.add(contact)

        # Get contact names from CampaignContact meta
        contact_names = {}
        if contact_phone_numbers:
            campaign_contacts = CampaignContact.objects.filter(
                phone__in=contact_phone_numbers
            ).values('phone', 'meta')
            for cc in campaign_contacts:
                meta = cc.get('meta', {})
                if isinstance(meta, dict) and meta.get('first_name'):
                    contact_names[normalize_phone(cc['phone'])] = meta['first_name']

        for msg in messages:
            if msg.to == phone_number:
                contact = msg.from_
                direction = "inbound"
            else:
                contact = msg.to
                direction = "outbound"

            contact = normalize_phone(contact)

            # Apply the search filter
            should_include = False
            if target_contact_phone:
                should_include = contact == target_contact_phone
            else:
                should_include = q in (contact or "")

            if not should_include:
                continue

            msg_time = msg.date_sent.isoformat() if msg.date_sent else datetime.utcnow().isoformat()
            preview = msg.body[:100] + ("..." if msg.body and len(msg.body) > 100 else "")

            if contact not in conversations:
                conversations[contact] = {
                    "contact": contact,
                    "contactName": contact_names.get(contact, ""),  # Add contact name if available
                    "lastMessage": preview,
                    "lastMessageTime": msg_time,
                    "lastMessageId": msg.sid,
                    "unreadCount": 0,
                    "messageCount": 1,
                    "lastMessageDirection": direction,
                }

            else:
                conversations[contact]["messageCount"] += 1
                if msg_time > conversations[contact]["lastMessageTime"]:
                    conversations[contact]["lastMessage"] = preview
                    conversations[contact]["lastMessageTime"] = msg_time
                    conversations[contact]["lastMessageId"] = msg.sid
                    conversations[contact]["lastMessageDirection"] = direction

        conversation_list = list(conversations.values())
        conversation_list.sort(key=lambda x: x["lastMessageTime"], reverse=True)
        conversation_list = conversation_list[:limit]

        return Response({
            "success": True,
            "count": len(conversation_list),
            "conversations": conversation_list,
        })

    except Exception as e:
        print(f"Error searching conversations: {str(e)}")
        return Response({
            "success": False,
            "error": str(e),
            "conversations": []
        }, status=500)

@api_view(["DELETE"])
def delete_conversation(request):
    phone_number = request.data.get("phoneNumber")
    contact_number = request.data.get("contact")

    max_delete = request.data.get("max")
    days = request.data.get("days")
    try:
        max_delete = int(max_delete) if max_delete is not None else 500
    except (TypeError, ValueError):
        max_delete = 500
    if max_delete < 1:
        max_delete = 1
    if max_delete > 5000:
        max_delete = 5000

    try:
        days = int(days) if days is not None else 365
    except (TypeError, ValueError):
        days = 365
    if days < 1:
        days = 1
    if days > 3650:
        days = 3650

    if not phone_number or not contact_number:
        return Response({"success": False, "error": "phoneNumber and contact are required"}, status=400)

    phone_number = normalize_phone(phone_number)
    contact_number = normalize_phone(contact_number)

    deleted = 0
    failed = 0

    try:
        date_after = datetime.utcnow() - timedelta(days=days)
        for msg in twilio_client.messages.list(from_=phone_number, to=contact_number, date_sent_after=date_after, limit=max_delete + 1):
            if deleted + failed >= max_delete:
                break
            try:
                twilio_client.messages(msg.sid).delete()
                deleted += 1
            except Exception as e:
                failed += 1
                print(f"Error deleting outgoing message {msg.sid}: {e}")

        for msg in twilio_client.messages.list(from_=contact_number, to=phone_number, date_sent_after=date_after, limit=max_delete + 1):
            if deleted + failed >= max_delete:
                break
            try:
                twilio_client.messages(msg.sid).delete()
                deleted += 1
            except Exception as e:
                failed += 1
                print(f"Error deleting incoming message {msg.sid}: {e}")

        return Response({"success": True, "deleted": deleted, "failed": failed})

    except Exception as e:
        print(f"Error deleting conversation: {str(e)}")
        return Response({"success": False, "error": str(e)}, status=500)

@api_view(["GET"])
def fetch_notifications(request):
    """Fetch notifications for a phone number"""
    phone_number = request.GET.get("phoneNumber")
    limit = int(request.GET.get("limit", 50))

    if not phone_number:
        return Response({"error": "phoneNumber is required"}, status=400)

    try:
        phone_number = normalize_phone(phone_number)
        notifications = Notification.objects.filter(
            to_phone=phone_number
        ).order_by('-timestamp')[:limit]

        # Get contact names from CampaignContact meta
        from_phones = [n.from_phone for n in notifications]
        contact_names = {}
        if from_phones:
            campaign_contacts = CampaignContact.objects.filter(
                phone__in=from_phones
            ).values('phone', 'meta')
            for cc in campaign_contacts:
                meta = cc.get('meta', {})
                if isinstance(meta, dict) and meta.get('first_name'):
                    contact_names[cc['phone']] = meta['first_name']

        notification_list = []
        for notification in notifications:
            notification_list.append({
                "id": f"{notification.message_sid}-{notification.timestamp.isoformat()}",
                "contact": notification.from_phone,
                "contactName": contact_names.get(notification.from_phone, ""),
                "body": notification.body,
                "timestamp": notification.timestamp.isoformat(),
                "seen": notification.seen,
            })

        return Response({
            "success": True,
            "count": len(notification_list),
            "notifications": notification_list,
        })

    except Exception as e:
        print(f"Error fetching notifications: {str(e)}")
        return Response({
            "success": False,
            "error": str(e),
            "notifications": []
        }, status=500)

@api_view(["POST"])
def mark_notifications_seen(request):
    """Mark notifications as seen for a specific contact"""
    phone_number = request.data.get("phoneNumber")
    contact_phone = request.data.get("contactPhone")

    if not phone_number or not contact_phone:
        return Response({"error": "phoneNumber and contactPhone are required"}, status=400)

    try:
        updated_count = Notification.objects.filter(
            to_phone=normalize_phone(phone_number),
            from_phone=normalize_phone(contact_phone),
            seen=False
        ).update(seen=True)

        return Response({
            "success": True,
            "updated": updated_count,
        })

    except Exception as e:
        print(f"Error marking notifications as seen: {str(e)}")
        return Response({
            "success": False,
            "error": str(e)
        }, status=500)