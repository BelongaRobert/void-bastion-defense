# campaign/consumers.py
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync, sync_to_async
from datetime import datetime
import json


class CampaignConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.accept()

        self.global_group = "campaign_global"

        await self.channel_layer.group_add(
            self.global_group,
            self.channel_name
        )
    
    async def disconnect(self, close_code):
        # Leave campaign group on disconnect
        if hasattr(self, 'campaign_group'):
            await self.channel_layer.group_discard(
                self.campaign_group,
                self.channel_name
            )

        if hasattr(self, 'global_group'):
            await self.channel_layer.group_discard(
                self.global_group,
                self.channel_name
            )
    
    async def receive(self, text_data):
        data = json.loads(text_data)
        
        if data["type"] == "subscribe_campaign":
            campaign_id = data["campaignId"]

            if hasattr(self, 'campaign_group'):
                await self.channel_layer.group_discard(
                    self.campaign_group,
                    self.channel_name
                )

            self.campaign_group = f"campaign_{campaign_id}"
            
            # Join the campaign group
            await self.channel_layer.group_add(
                self.campaign_group,
                self.channel_name
            )
            
            # Handle global subscription differently
            if campaign_id == 'global':
                # For global subscription, just confirm without stats
                await self.send(json.dumps({
                    "type": "subscribed",
                    "campaignId": campaign_id,
                    "status": "global",
                    "timestamp": datetime.utcnow().isoformat(),
                    "stats": None
                }))
            else:
                # For specific campaign, get stats and campaign info
                try:
                    # Get initial stats from Redis
                    from .redis_stats import stats_manager
                    stats = await sync_to_async(stats_manager.get_stats)(campaign_id)

                    from .models import Campaign
                    campaign = await sync_to_async(Campaign.objects.get)(id=campaign_id)

                    # Send confirmation with initial stats
                    await self.send(json.dumps({
                        "type": "subscribed",
                        "campaignId": campaign_id,
                        "status": campaign.status,
                        "timestamp": datetime.utcnow().isoformat(),
                        "stats": stats
                    }))
                except Exception as e:
                    # If campaign not found or error, send error response
                    await self.send(json.dumps({
                        "type": "error",
                        "message": f"Failed to subscribe to campaign {campaign_id}: {str(e)}",
                        "campaignId": campaign_id
                    }))

        if data.get("type") == "unsubscribe_campaign":
            campaign_id = data.get("campaignId")
            if campaign_id:
                group = f"campaign_{campaign_id}"
                await self.channel_layer.group_discard(group, self.channel_name)
                if hasattr(self, 'campaign_group') and self.campaign_group == group:
                    delattr(self, 'campaign_group')
    
    async def campaign_event(self, event):
        """
        Handler for campaign events from channel layer
        """
        await self.send(json.dumps(event["data"]))
    
    async def campaign_progress(self, event):
        """
        Handler for progress updates
        """
        await self.send(json.dumps({
            "type": "progress_update",
            "campaignId": event["data"].get("campaign_id"),
            "processed": event["data"].get("processed"),
            "total": event["data"].get("total"),
            "stats": event["data"].get("stats"),
            "timestamp": datetime.utcnow().isoformat()
        }))