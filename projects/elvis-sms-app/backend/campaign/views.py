# campaign/views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Campaign, CampaignContact
import csv
from io import TextIOWrapper
from .serializers import CampaignSerializer, CampaignContactSerializer
from .utils import send_campaign_ws
from .redis_stats import stats_manager
from rest_framework import status
from django.shortcuts import get_object_or_404
from .tasks import pause_campaign, run_campaign


def render_template(template, meta):
    # Clean keys and values
    clean_meta = {k.strip(): str(v).strip() for k, v in meta.items()}
    msg = template
    for k, v in clean_meta.items():
        msg = msg.replace(f"{{{{{k}}}}}", v)
    return msg


@api_view(["POST"])
def upload_contacts(request, campaign_id):
    campaign = Campaign.objects.get(id=campaign_id)
    # campaign = Campaign.objects.get(id=campaign_id, user=request.user)
    csv_file = request.FILES["file"]

    reader = csv.DictReader(TextIOWrapper(csv_file, encoding="utf-8"))
    headers = reader.fieldnames or []
    variables = [h for h in headers if h != "phone"]

    # save variables on campaign
    campaign.variables = variables
    campaign.save(update_fields=["variables"])
    contacts = []

    for row in reader:
        phone = row.pop("phone")
        rendered = render_template(campaign.template, row)
        contacts.append(
            CampaignContact(
                campaign=campaign,
                phone=phone,
                meta=row,
                rendered_message=rendered
            )
        )

    CampaignContact.objects.bulk_create(contacts)
    
    # Initialize stats in Redis with just total
    stats_manager.initialize_stats(campaign_id, len(contacts))

    stats = stats_manager.get_stats(campaign_id)
    
    # Send WebSocket event
    send_campaign_ws(campaign_id, {
        'type': 'CONTACTS_UPLOADED',
        'campaign_id': campaign_id,
        'count': len(contacts),
        'stats': stats,
    })
    
    return Response({
        "success": True,
        "message": "Contacts uploaded successfully",
        "campaignId": campaign_id,
        "count": len(contacts),
        "stats": stats,
    })


@api_view(['GET', 'POST'])
def campaign_list_create(request):
    if request.method == 'GET':
        campaigns = Campaign.objects.all()
        # campaigns = Campaign.objects.filter(user=request.user)
        serializer = CampaignSerializer(campaigns, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        serializer = CampaignSerializer(data=request.data)
        if serializer.is_valid():
            # campaign = serializer.save(user=request.user)
            campaign = serializer.save()
            csv_file = request.FILES.get("file")
            
            if csv_file:
                reader = csv.DictReader(TextIOWrapper(csv_file, encoding="utf-8"))
                headers = reader.fieldnames or []
                variables = [h for h in headers if h != "phone"]

                # save variables on campaign
                campaign.variables = variables
                campaign.save()
                contacts = []

                for row in reader:
                    phone = row.pop("phone")
                    rendered = render_template(campaign.template, row)

                    contacts.append(
                        CampaignContact(
                            campaign=campaign,
                            phone=phone,
                            meta=row,
                            rendered_message=rendered
                        )
                    )

                CampaignContact.objects.bulk_create(contacts)
                
                # Initialize stats in Redis with just total
                stats_manager.initialize_stats(campaign.id, len(contacts))
            
            # Send WS event
            send_campaign_ws('global', {
                'type': 'CAMPAIGN_CREATED',
                'campaign': CampaignSerializer(campaign).data
            })
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
def campaign_contacts(request, campaign_id):
    campaign = get_object_or_404(Campaign, id=campaign_id)

    try:
        page = int(request.GET.get('page', 1))
    except (TypeError, ValueError):
        page = 1

    try:
        page_size = int(request.GET.get('pageSize', 25))
    except (TypeError, ValueError):
        page_size = 25

    if page < 1:
        page = 1
    if page_size < 1:
        page_size = 25
    if page_size > 200:
        page_size = 200

    qs = CampaignContact.objects.filter(campaign=campaign)

    status_filter = request.GET.get('status')
    if status_filter:
        qs = qs.filter(status=status_filter)

    total = qs.count()
    start = (page - 1) * page_size
    end = start + page_size

    items = qs.order_by('-id')[start:end]
    serializer = CampaignContactSerializer(items, many=True)

    total_pages = (total + page_size - 1) // page_size if total else 1

    return Response({
        'success': True,
        'campaignId': campaign_id,
        'page': page,
        'pageSize': page_size,
        'total': total,
        'totalPages': total_pages,
        'results': serializer.data,
    })

@api_view(['GET', 'PUT', 'DELETE'])
def campaign_detail(request, campaign_id):
    campaign = get_object_or_404(Campaign, id=campaign_id)
    # campaign = get_object_or_404(Campaign, id=campaign_id, user=request.user)
    
    if request.method == 'GET':
        serializer = CampaignSerializer(campaign)
        return Response(serializer.data)
    
    elif request.method == 'PUT':
        serializer = CampaignSerializer(campaign, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            # Send WS event
            send_campaign_ws(campaign_id, {
                'type': 'CAMPAIGN_UPDATED',
                'campaign': serializer.data
            })
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        # Delete stats from Redis
        stats_manager.delete_stats(campaign_id)
        
        campaign.delete()
        # Send WS event
        send_campaign_ws('global', {
            'type': 'CAMPAIGN_DELETED',
            'campaign_id': campaign_id
        })
        return Response(status=status.HTTP_204_NO_CONTENT)

# Campaign Actions
@api_view(['POST'])
def campaign_action(request, campaign_id):
    """
    Handle campaign actions: start, pause, complete
    """
    # campaign = get_object_or_404(Campaign, id=campaign_id, user=request.user)
    campaign = get_object_or_404(Campaign, id=campaign_id)
    action = request.data.get('action')
    
    if action == 'start':
        # Validate can start
        if campaign.status not in ["stopped", "draft", "paused"]:
            return Response(
                {'error': f'Campaign must be in draft or paused status to start'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if there are queued contacts
        queued_count = campaign.contacts.filter(status="queued").count()
        if queued_count == 0:
            return Response(
                {'error': 'No queued contacts to send'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Start Celery task
        task = run_campaign.delay(campaign_id)
        
        # Send immediate WebSocket update
        send_campaign_ws(campaign_id, {
            "type": "campaign_starting",
            "task_id": task.id,
            "queued_contacts": queued_count
        })
        
        return Response({
            'status': 'success',
            'message': 'Campaign started',
            'task_id': task.id,
            'queued_contacts': queued_count
        })
        
    elif action == 'pause':
        # Validate can pause
        if campaign.status != "running":
            return Response(
                {'error': 'Only running campaigns can be paused'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Pause campaign via Celery
        pause_campaign.delay(campaign_id)
        
        # Send immediate WebSocket update
        send_campaign_ws(campaign_id, {
            "type": "campaign_pausing",
            "message": "Pausing campaign..."
        })
        
        return Response({
            'status': 'success',
            'message': 'Campaign pause requested'
        })
        
    elif action == 'stop':
        # Force stop campaign (similar to pause but different status)
        campaign.status = "stopped"
        campaign.save(update_fields=["status"])
        
        send_campaign_ws(campaign_id, {
            "type": "campaign_stopped",
            "message": "Campaign stopped by user"
        })
        
        return Response({
            'status': 'success',
            'message': 'Campaign stopped'
        })
        
    elif action == 'resume':
        # Resume from paused
        if campaign.status != "paused":
            return Response(
                {'error': 'Only paused campaigns can be resumed'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Resume by starting again (will continue from where it left)
        task = run_campaign.delay(campaign_id)
        
        send_campaign_ws(campaign_id, {
            "type": "campaign_resuming",
            "task_id": task.id
        })
        
        return Response({
            'status': 'success',
            'message': 'Campaign resuming',
            'task_id': task.id
        })
    
    else:
        return Response(
            {'error': 'Invalid action. Use: start, pause, stop, resume'},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(["POST"])
def create_custom_contact(request):
    """Create or update a custom contact for display names"""
    phone = request.data.get('phone')
    first_name = request.data.get('first_name')

    if not phone or not first_name:
        return Response(
            {'error': 'phone and first_name are required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    phone = str(phone).strip()
    if phone and not phone.startswith("+"):
        phone = "+" + phone

    # Get or create "Custom Contacts" campaign
    campaign, created = Campaign.objects.get_or_create(
        name="Custom Contacts",
        defaults={
            'template': 'Custom contact',
            'status': 'completed'  # Mark as completed so it doesn't run
        }
    )

    # Create or update contact
    contact, created = CampaignContact.objects.get_or_create(
        campaign=campaign,
        phone=phone,
        defaults={
            'meta': {'first_name': first_name},
            'rendered_message': f'Contact: {first_name}',
            'status': 'queued'
        }
    )

    # Update if it already exists
    if not created:
        contact.meta = {'first_name': first_name}
        contact.save(update_fields=['meta'])

    return Response({
        'success': True,
        'contact': {
            'id': contact.id,
            'phone': contact.phone,
            'first_name': first_name,
            'campaign_id': campaign.id
        }
    })