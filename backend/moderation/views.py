from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from engagement.models import Comment
from content.models import Idea

from .exceptions import ModerationTransitionError
from .models import Report
from .pagination import ReportCursorPagination
from .permissions import IsModeratorOrAdmin
from .serializers import (
    CommentReportCreateSerializer,
    ModerationNoteSerializer,
    ReportDetailSerializer,
    ReportListSerializer,
    ReportPublicSerializer,
    ReportStatusFilterSerializer,
)
from .services import (
    create_comment_report,
    hide_reported_comment,
    reject_report,
    resolve_report,
    start_review,
)


class CommentReportView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, comment_id):
        comment = get_object_or_404(
            Comment.objects.select_related("idea"),
            pk=comment_id,
            status=Comment.CommentStatus.VISIBLE,
            idea__status=Idea.IdeaStatus.PUBLISHED,
        )
        serializer = CommentReportCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        report = create_comment_report(
            reporter=request.user,
            comment=comment,
            reason=serializer.validated_data["reason"],
            details=serializer.validated_data.get("details", ""),
        )
        return Response(
            ReportPublicSerializer(report).data,
            status=status.HTTP_201_CREATED,
        )


class ReportListView(ListAPIView):
    serializer_class = ReportListSerializer
    permission_classes = [IsModeratorOrAdmin]
    pagination_class = ReportCursorPagination

    def get_queryset(self):
        filter_serializer = ReportStatusFilterSerializer(
            data=self.request.query_params
        )
        filter_serializer.is_valid(raise_exception=True)

        queryset = Report.objects.select_related("reporter").order_by("-id")
        requested_status = filter_serializer.validated_data.get("status")
        if requested_status:
            queryset = queryset.filter(status=requested_status)
        return queryset


class ReportDetailView(RetrieveAPIView):
    queryset = (
        Report.objects.select_related("reporter")
        .prefetch_related("actions__moderator")
        .order_by("-id")
    )
    serializer_class = ReportDetailSerializer
    permission_classes = [IsModeratorOrAdmin]


class ReportActionView(APIView):
    permission_classes = [IsModeratorOrAdmin]
    service = None

    def post(self, request, report_id):
        get_object_or_404(Report, pk=report_id)
        serializer = ModerationNoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            report_or_target = self.service(
                actor=request.user,
                report_id=report_id,
                note=serializer.validated_data.get("note", ""),
            )
        except ModerationTransitionError as exc:
            raise ValidationError({"detail": str(exc)}) from exc

        if isinstance(report_or_target, Report):
            return Response(ReportDetailSerializer(report_or_target).data)
        return Response(status=status.HTTP_204_NO_CONTENT)


class StartReviewView(ReportActionView):
    service = staticmethod(start_review)


class HideReportedCommentView(ReportActionView):
    service = staticmethod(hide_reported_comment)


class ResolveReportView(ReportActionView):
    service = staticmethod(resolve_report)


class RejectReportView(ReportActionView):
    service = staticmethod(reject_report)
