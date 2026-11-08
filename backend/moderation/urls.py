from django.urls import path

from .views import (
    CommentReportView,
    HideIdeaDirectlyView,
    HideReportedCommentView,
    HiddenIdeaListView,
    IdeaReportView,
    RejectReportView,
    ReportDetailView,
    ReportListView,
    ResolveReportView,
    RestoreIdeaDirectlyView,
    StartReviewView,
)


app_name = "moderation"

urlpatterns = [
    path(
        "comments/<int:comment_id>/report/",
        CommentReportView.as_view(),
        name="comment-report",
    ),
    path(
        "ideas/<int:idea_id>/report/",
        IdeaReportView.as_view(),
        name="idea-report",
    ),
    path(
        "moderation/ideas/",
        HiddenIdeaListView.as_view(),
        name="hidden-idea-list",
    ),
    path(
        "moderation/ideas/<int:idea_id>/hide/",
        HideIdeaDirectlyView.as_view(),
        name="idea-hide",
    ),
    path(
        "moderation/ideas/<int:idea_id>/restore/",
        RestoreIdeaDirectlyView.as_view(),
        name="idea-restore",
    ),
    path("moderation/reports/", ReportListView.as_view(), name="report-list"),
    path(
        "moderation/reports/<int:pk>/",
        ReportDetailView.as_view(),
        name="report-detail",
    ),
    path(
        "moderation/reports/<int:report_id>/start-review/",
        StartReviewView.as_view(),
        name="report-start-review",
    ),
    path(
        "moderation/reports/<int:report_id>/hide-comment/",
        HideReportedCommentView.as_view(),
        name="report-hide-comment",
    ),
    path(
        "moderation/reports/<int:report_id>/resolve/",
        ResolveReportView.as_view(),
        name="report-resolve",
    ),
    path(
        "moderation/reports/<int:report_id>/reject/",
        RejectReportView.as_view(),
        name="report-reject",
    ),
]
