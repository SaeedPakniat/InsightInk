from django.urls import include, path
from rest_framework.routers import DefaultRouter

from content.views import CreatorIdeaViewSet, IdeaViewSet, SourceViewSet, TopicViewSet

from .views import health

app_name = "api"

router = DefaultRouter()
router.register("topics", TopicViewSet, basename="topic")
router.register("sources", SourceViewSet, basename="source")
router.register("ideas", IdeaViewSet, basename="idea")
router.register("me/ideas", CreatorIdeaViewSet, basename="creator-idea")

urlpatterns = [
    path("", include("accounts.urls")),
    path("", include("creators.urls")),
    path("health/", health, name="health"),
] + router.urls
