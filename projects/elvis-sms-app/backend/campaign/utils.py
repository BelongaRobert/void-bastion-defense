# campaign/ws.py

from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from datetime import datetime

def send_campaign_ws(campaign_id, payload: dict):
    """
    Send WebSocket update to all subscribed clients for a campaign
    """
    channel_layer = get_channel_layer()
    
    async_to_sync(channel_layer.group_send)(
        f"campaign_{campaign_id}",
        {
            "type": "campaign_event",
            "data": {
                **payload,
                "campaignId": campaign_id,
                "timestamp": datetime.utcnow().isoformat()
            }
        }
    )
