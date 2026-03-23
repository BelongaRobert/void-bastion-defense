# campaign/utils/redis_stats.py
import redis
from django.conf import settings
import json
from datetime import datetime
from django.core.cache import cache
from django.db.models import Count, Q

class CampaignStatsManager:
    """Manager for campaign statistics stored in Redis"""
    
    def __init__(self):
        self.redis_client = cache

    def _get_raw_client(self):
        try:
            return self.redis_client.client.get_client()
        except Exception:
            return None
    
    def get_stats(self, campaign_id):  # <-- THIS MUST HAVE campaign_id PARAMETER
        """Get campaign statistics from Redis"""
        stats_key = f'campaign:{campaign_id}:stats'
        
        try:
            raw = self._get_raw_client()
            if raw is not None:
                data = raw.hgetall(stats_key)
                if data:
                    stats = {}
                    for k, v in data.items():
                        key = k.decode() if isinstance(k, (bytes, bytearray)) else str(k)
                        val = v.decode() if isinstance(v, (bytes, bytearray)) else v
                        try:
                            stats[key] = int(val)
                        except Exception:
                            stats[key] = 0

                    for field in ["total", "sent", "failed", "delivered", "replied"]:
                        stats[field] = int(stats.get(field, 0) or 0)
                    stats["pending"] = stats.get("total", 0) - (stats.get("sent", 0) + stats.get("failed", 0))
                    return stats
        except Exception as e:
            print(f"Redis error getting stats: {e}")
        
        # Fallback to database calculation
        return self._calculate_db_stats(campaign_id)

    def _calculate_db_stats(self, campaign_id):
        """Calculate stats from database"""
        from .models import Campaign
        try:
            campaign = Campaign.objects.get(id=campaign_id)
            total = campaign.contacts.count()
            sent = campaign.contacts.filter(status='sent').count()
            failed = campaign.contacts.filter(status='failed').count()
            delivered = campaign.contacts.filter(status='delivered').count()
            replied = campaign.contacts.filter(status='replied').count()
            
            return {
                'total': total,
                'sent': sent,
                'failed': failed,
                'delivered': delivered,
                'replied': replied,
                'pending': total - (sent + failed)
            }
        except Campaign.DoesNotExist:
            return {
                'total': 0,
                'sent': 0,
                'failed': 0,
                'delivered': 0,
                'replied': 0,
                'pending': 0
            }

    
    def update_stats(self, campaign_id, stats_updates):
        """Update campaign statistics in Redis"""
        stats_key = f'campaign:{campaign_id}:stats'
        
        try:
            raw = self._get_raw_client()
            if raw is None:
                return None

            pipeline = raw.pipeline()
            
            for key, increment in stats_updates.items():
                pipeline.hincrby(stats_key, key, increment)
            
            if 'total' not in stats_updates:
                pipeline.hsetnx(stats_key, 'total', 0)
            
            pipeline.execute()
            
            # Set expiration
            raw.expire(stats_key, 3600)
            
            # Return updated stats
            return self.get_stats(campaign_id)
            
        except Exception as e:
            print(f"Redis error updating stats: {e}")
            return None

    def initialize_stats(self, campaign_id, total_contacts):
        """Initialize stats for a new campaign"""
        stats_key = f'campaign:{campaign_id}:stats'
        
        initial_stats = {
            'total': total_contacts,
            'sent': 0,
            'failed': 0,
            'delivered': 0,
            'replied': 0,
            'pending': total_contacts
        }
        
        try:
            raw = self._get_raw_client()
            if raw is None:
                return None

            # Use hash for better performance
            raw.hset(stats_key, mapping=initial_stats)
            raw.expire(stats_key, 86400)  # 24 hours
            return initial_stats
        except Exception as e:
            print(f"Redis error initializing stats: {e}")
            return None

    
    def delete_stats(self, campaign_id):
        """Delete campaign stats from Redis"""
        stats_key = f'campaign:{campaign_id}:stats'
        try:
            raw = self._get_raw_client()
            if raw is not None:
                raw.delete(stats_key)
            else:
                self.redis_client.delete(stats_key)
            return True
        except Exception as e:
            print(f"Redis error deleting stats: {e}")
            return False

# Create a singleton instance
stats_manager = CampaignStatsManager()