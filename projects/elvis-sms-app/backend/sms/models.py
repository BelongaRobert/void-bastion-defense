from django.db import models
from django.utils import timezone

class Notification(models.Model):
    """Model to store incoming message notifications"""
    
    message_sid = models.CharField(max_length=100, unique=True, null=True, blank=True)
    from_phone = models.CharField(max_length=20, null=True, blank=True)
    to_phone = models.CharField(max_length=20, null=True, blank=True)
    body = models.TextField(null=True, blank=True)
    timestamp = models.DateTimeField(default=timezone.now, null=True, blank=True)
    seen = models.BooleanField(default=False, null=True, blank=True)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['to_phone', 'seen']),
            models.Index(fields=['timestamp']),
        ]
    
    def __str__(self):
        return f"Notification from {self.from_phone} to {self.to_phone}"
