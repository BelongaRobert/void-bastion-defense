# campaign/serializers.py
from rest_framework import serializers
from .models import Campaign, CampaignContact


class CampaignSerializer(serializers.ModelSerializer):
    stats = serializers.SerializerMethodField()
    
    class Meta:
        model = Campaign
        fields = ['id', 'name', 'from_number', 'template', 'status', 
                  'variables', 'created_at', 'stats']
        read_only_fields = ['created_at', 'variables', 'stats']
    
    def get_stats(self, obj):
        return obj.get_stats()  # This calls the model's get_stats method
    
class CampaignContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = CampaignContact
        fields = [
            'id', 'campaign', 'phone', 'meta', 
            'rendered_message', 'status', 'message_sid', 'error_message', 'replied_at'
        ]
        read_only_fields = ['rendered_message', 'message_sid', 'error_message', 'replied_at']