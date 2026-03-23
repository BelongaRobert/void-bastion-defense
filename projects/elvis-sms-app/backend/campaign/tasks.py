from celery import shared_task
from celery.exceptions import SoftTimeLimitExceeded
from .models import Campaign, CampaignContact
from sms.services import send_twilio_message
from .utils import send_campaign_ws
import time
from .redis_stats import stats_manager
from sms.services import send_twilio_message
import asyncio


@shared_task
def run_campaign(campaign_id):
    """Run a campaign - send messages to all contacts"""
    try:
        campaign = Campaign.objects.get(id=campaign_id)
        
        # Update campaign status
        campaign.status = 'running'
        campaign.save(update_fields=['status'])
        
        # Send WebSocket update
        send_campaign_ws(campaign_id, {
            'type': 'CAMPAIGN_STARTED',
            'campaign_id': campaign_id
        })
        
        # Get queued contacts
        contacts = CampaignContact.objects.filter(
            campaign=campaign,
            status='queued'
        )
        
        total_contacts = contacts.count()
        processed = 0
        
        # Initialize stats with total
        stats_manager.initialize_stats(campaign_id, total_contacts)
        
        for contact in contacts:
            time.sleep(1)
            try:
                # Send SMS
                result = asyncio.run(send_twilio_message(
                    to=contact.phone,
                    body=contact.rendered_message,
                    from_number=campaign.from_number
                ))
                
                # Update based on result - USE SINGLE KEY NAMES
                if result.get('status') != "failed":
                    contact.status = 'sent'
                    contact.message_sid = result.get('sid')
                    contact.save()
                    
                    # Update Redis stats - use consistent keys
                    stats_manager.update_stats(campaign_id, {'sent': 1})
                else:
                    contact.status = 'failed'
                    contact.error_message = result.get('error')
                    contact.save()
                    
                    # Update Redis stats - use consistent keys
                    stats_manager.update_stats(campaign_id, {'failed': 1})
                
            except Exception as e:
                print(f"Error sending to {contact.phone}: {e}")
                contact.status = 'failed'
                contact.error_message = str(e)
                contact.save()
                
                # Update Redis stats - use consistent keys
                stats_manager.update_stats(campaign_id, {'failed': 1})
            
            processed += 1
            
            # Get current stats from Redis
            current_stats = stats_manager.get_stats(campaign_id)
            
            # Send progress update
            send_campaign_ws(campaign_id, {
                "type": "campaign_progress",
                "campaign_id": campaign_id,
                "processed": processed,
                "total": total_contacts,
                "stats": current_stats
            })
        
            # Check if campaign was paused/stopped
            campaign.refresh_from_db()
            if campaign.status in ['paused', 'stopped']:
                break
        
        # Final status update
        campaign.refresh_from_db()
        if campaign.status == 'running':
            campaign.status = 'completed'
            campaign.save(update_fields=['status'])
            
            # Get final stats from Redis
            final_stats = stats_manager.get_stats(campaign_id)
            
            send_campaign_ws(campaign_id, {
                'type': 'CAMPAIGN_COMPLETED',
                'campaign_id': campaign_id,
                'stats': final_stats
            })
        
        return {
            'campaign_id': campaign_id,
            'processed': processed,
            'total': total_contacts
        }
        
    except Campaign.DoesNotExist:
        print(f"Campaign {campaign_id} not found")
        return {'error': 'Campaign not found'}
    except Exception as e:
        print(f"Error running campaign {campaign_id}: {e}")
        
        # Update campaign status to failed
        try:
            campaign = Campaign.objects.get(id=campaign_id)
            campaign.status = 'failed'
            campaign.save(update_fields=['status'])
        except:
            pass
        
        send_campaign_ws(campaign_id, {
            'type': 'CAMPAIGN_FAILED',
            'campaign_id': campaign_id,
            'error': str(e)
        })
        
        raise

@shared_task
def pause_campaign(campaign_id):
    """Pause a running campaign"""
    try:
        campaign = Campaign.objects.get(id=campaign_id)
        campaign.status = 'paused'
        campaign.save(update_fields=['status'])
        
        send_campaign_ws(campaign_id, {
            'type': 'CAMPAIGN_PAUSED',
            'campaign_id': campaign_id
        })
        
        return {'status': 'paused', 'campaign_id': campaign_id}
    except Exception as e:
        print(f"Error pausing campaign {campaign_id}: {e}")
        return {'error': str(e)}

# Additional task to update delivery status
@shared_task
def update_delivery_status(message_sid, status):
    """Update message delivery status"""
    try:
        contact = CampaignContact.objects.get(message_sid=message_sid)
        
        if status == 'delivered':
            contact.status = 'delivered'
            contact.save()
            
            # Update Redis stats - use consistent keys
            stats_manager.update_stats(contact.campaign_id, {'delivered': 1})
            
        elif status == 'failed':
            # Only update if not already failed
            if contact.status != 'failed':
                contact.status = 'failed'
                contact.save()
                
                # Update Redis stats
                stats_manager.update_stats(contact.campaign_id, {'failed': 1})
        
        # Send WebSocket update
        send_campaign_ws(contact.campaign_id, {
            'type': 'MESSAGE_STATUS_UPDATE',
            'contact_id': contact.id,
            'status': status
        })
        
    except CampaignContact.DoesNotExist:
        print(f"Contact with SID {message_sid} not found")