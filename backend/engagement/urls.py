from django.urls import path

from .views import (
    CommentDetailView,
    IdeaCommentsView,
    SaveView,
    SparkView,
    ViewerEngagementStateView,
)


app_name = "engagement"

urlpatterns = [
    path("me/engagement/", ViewerEngagementStateView.as_view(), name="me-engagement"),
    path("ideas/<int:idea_id>/spark/", SparkView.as_view(), name="idea-spark"),
    path("ideas/<int:idea_id>/save/", SaveView.as_view(), name="idea-save"),
    path(
        "ideas/<int:idea_id>/comments/",
        IdeaCommentsView.as_view(),
        name="idea-comments",
    ),
    path(
        "comments/<int:comment_id>/",
        CommentDetailView.as_view(),
        name="comment-detail",
    ),
]
