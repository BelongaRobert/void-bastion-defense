from django.urls import path
from .views import incoming_webhook, status_webhook, send_message, fetch_messages, fetch_conversations, delete_conversation, search_conversations, fetch_notifications, mark_notifications_seen

urlpatterns = [
    path("webhook/incoming", incoming_webhook),
    path("webhook/status", status_webhook),
    path("api/send", send_message),
    path("api/messages", fetch_messages),
    path("api/conversations", fetch_conversations),  # Add this line
    path("api/conversations/search", search_conversations),
    path("api/conversations/delete", delete_conversation),
    path("api/notifications", fetch_notifications),
    path("api/notifications/mark-seen", mark_notifications_seen),
]