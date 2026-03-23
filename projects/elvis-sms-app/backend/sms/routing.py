from django.urls import re_path
from sms.consumers import SMSConsumer
from campaign.consumers import CampaignConsumer

websocket_urlpatterns = [
    re_path(r'ws$', SMSConsumer.as_asgi()),
    re_path(r"ws/campaign$", CampaignConsumer.as_asgi()),

]
