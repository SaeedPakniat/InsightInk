from django.urls import path

from .views import (
    CreatorDetailView,
    CreatorFollowView,
    CreatorIdeasView,
    CreatorListView,
    CreatorProfileSelfView,
)


app_name = "creators"

urlpatterns = [
    path("me/creator/", CreatorProfileSelfView.as_view(), name="me-creator"),
    path("creators/", CreatorListView.as_view(), name="creator-list"),
    path("creators/<int:pk>/", CreatorDetailView.as_view(), name="creator-detail"),
    path(
        "creators/<int:creator_id>/ideas/",
        CreatorIdeasView.as_view(),
        name="creator-ideas",
    ),
    path(
        "creators/<int:creator_id>/follow/",
        CreatorFollowView.as_view(),
        name="creator-follow",
    ),
]
