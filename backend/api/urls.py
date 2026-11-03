from django.urls import path
from rest_framework.routers import DefaultRouter

from content.views import TopicViewSet

from .views import health

app_name = "api"

router = DefaultRouter()
router.register("topics", TopicViewSet, basename="topic")

urlpatterns = [
    path("health/", health, name="health"),
] + router.urls
