from django.urls import path

from .views import (
    CommentReportView,
    HideReportedCommentView,
    RejectReportView,
    ReportDetailView,
    ReportListView,
    ResolveReportView,
    StartReviewView,
)


app_name = "moderation"

urlpatterns = [
    path(
        "comments/<int:comment_id>/report/",
        CommentReportView.as_view(),
        name="comment-report",
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
