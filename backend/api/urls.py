from django.urls import path
from rest_framework.routers import DefaultRouter

from content.views import IdeaViewSet, SourceViewSet, TopicViewSet

from .views import health

app_name = "api"

router = DefaultRouter()
router.register("topics", TopicViewSet, basename="topic")
router.register("sources", SourceViewSet, basename="source")
router.register("ideas", IdeaViewSet, basename="idea")

urlpatterns = [
    path("health/", health, name="health"),
] + router.urls
