from django.urls import include, path
from rest_framework.routers import DefaultRouter

from content.views import (
    ContentLanguageViewSet,
    CreatorIdeaViewSet,
    CreatorSourceCreateView,
    FeedView,
    IdeaViewSet,
    SourceViewSet,
    TopicViewSet,
)

from .views import health

app_name = "api"

router = DefaultRouter()
router.register("languages", ContentLanguageViewSet, basename="language")
router.register("topics", TopicViewSet, basename="topic")
router.register("sources", SourceViewSet, basename="source")
router.register("ideas", IdeaViewSet, basename="idea")
router.register("me/ideas", CreatorIdeaViewSet, basename="creator-idea")

urlpatterns = [
    path("", include("accounts.urls")),
    path("", include("creators.urls")),
    path("", include("engagement.urls")),
    path("", include("library.urls")),
    path("", include("explore.urls")),
    path("", include("recommendations.urls")),
    path("", include("moderation.urls")),
    path("health/", health, name="health"),
    path("feed/", FeedView.as_view(), name="feed"),
    path(
        "me/sources/",
        CreatorSourceCreateView.as_view(),
        name="creator-source-create",
    ),
] + router.urls
