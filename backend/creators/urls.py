from django.urls import path

from .views import CreatorProfileSelfView


app_name = "creators"

urlpatterns = [
    path("me/creator/", CreatorProfileSelfView.as_view(), name="me-creator"),
]
