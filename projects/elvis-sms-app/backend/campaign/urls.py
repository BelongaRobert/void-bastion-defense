from django.urls import path
from . import views

urlpatterns = [
    # Campaign CRUD
    path('', views.campaign_list_create, name='campaign-list'),
    path('<int:campaign_id>/', views.campaign_detail, name='campaign-detail'),
    path('<int:campaign_id>/action/', views.campaign_action, name='campaign-action'),
    path('<int:campaign_id>/upload/', views.upload_contacts, name='upload-contacts'),
    path('<int:campaign_id>/contacts/', views.campaign_contacts, name='campaign-contacts'),

    # Custom Contacts
    path('custom-contacts/', views.create_custom_contact, name='create-custom-contact'),
]