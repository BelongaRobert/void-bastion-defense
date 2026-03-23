from django.db import models
import os
from django.contrib.auth.models import User


class Campaign(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('scheduled', 'Scheduled'),
        ('running', 'Running'),
        ('paused', 'Paused'),
        ('completed', 'Completed'),
        ('stopped', 'Stopped'),
        ('failed', 'Failed'),
    ]
    
    # user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='campaigns')
    name = models.CharField(max_length=200)
    from_number = models.CharField(max_length=20, default=os.getenv("TWILIO_PHONE_NUMBER"), blank=True, null=True)
    template = models.TextField()
    variables = models.JSONField(default=list, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    
    # REMOVED: total_contacts, sent_count, failed_count, delivered_count, replied_count
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    scheduled_time = models.DateTimeField(null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # Performance tracking
    estimated_duration = models.IntegerField(default=0)  # in minutes
    actual_duration = models.IntegerField(default=0)  # in minutes
    
    # Settings
    messages_per_minute = models.IntegerField(default=60)
    allow_replies = models.BooleanField(default=False)
    stop_keywords = models.JSONField(default=list, blank=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def get_stats(self):
        """Get stats from Redis or calculate from DB"""
        from .redis_stats import stats_manager
        
        # Get from Redis
        redis_stats = stats_manager.get_stats(self.id)  
        
        if redis_stats:
            return {
                'total': redis_stats['total'],
                'total_count': redis_stats['total'],
                'sent': redis_stats['sent'],
                'sent_count': redis_stats['sent'],
                'failed': redis_stats['failed'],
                'failed_count': redis_stats['failed'],
                'delivered': redis_stats['delivered'],
                'delivered_count': redis_stats['delivered'],
                'replied': redis_stats['replied'],
                'replied_count': redis_stats['replied'],
                'pending': redis_stats['total'] - (redis_stats['sent'] + redis_stats['failed']),
                'pending_count': redis_stats['total'] - (redis_stats['sent'] + redis_stats['failed']),
            }
        
        # Fallback to database calculation (your existing logic)
        total = self.contacts.count()
        if total == 0:
            return {
                'total': 0,
                'total_count': 0,
                'sent': 0,
                'sent_count': 0,
                'failed': 0,
                'failed_count': 0,
                'delivered': 0,
                'delivered_count': 0,
                'replied': 0,
                'replied_count': 0,
                'pending': 0,
                'pending_count': 0
            }
        
        sent = self.contacts.filter(status='sent').count()
        failed = self.contacts.filter(status='failed').count()
        delivered = self.contacts.filter(status='delivered').count()
        replied = self.contacts.filter(status='replied').count()
        
        return {
            'total': total,
            'sent': sent,
            'failed': failed,
            'delivered': delivered,
            'replied': replied,
            'pending': total - (sent + failed)
        }


class CampaignContact(models.Model):
    campaign = models.ForeignKey(Campaign, related_name="contacts", on_delete=models.CASCADE)
    phone = models.CharField(max_length=20)

    meta = models.JSONField(default=dict)  # CSV columns
    rendered_message = models.TextField()

    status = models.CharField(
        max_length=20,
        default="queued",
        choices=[
            ("queued", "Queued"),
            ("sent", "Sent"),
            ("delivered", "Delivered"),
            ("failed", "Failed"),
            ("replied", "Replied"),
            ("opt_out", "Opt Out"),
            ("opt_in", "Opt In"),
        ]
    )

    message_sid = models.CharField(max_length=64, null=True, blank=True)
    error_message = models.TextField(null=True, blank=True)
    replied_at = models.DateTimeField(null=True, blank=True)


