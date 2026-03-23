from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include("sms.urls")),
    path('api/campaigns/', include("campaign.urls")),
]
