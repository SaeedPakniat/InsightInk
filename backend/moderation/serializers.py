from django.contrib.auth import get_user_model
from rest_framework import serializers

from engagement.models import Comment

from .models import ModerationAction, Report


User = get_user_model()


class ModeratorUserSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "display_name")
        read_only_fields = fields


class CommentReportCreateSerializer(serializers.Serializer):
    reason = serializers.ChoiceField(choices=Report.Reason.choices)
    details = serializers.CharField(
        required=False,
        allow_blank=True,
        trim_whitespace=True,
        max_length=2000,
    )


class ReportPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = ("id", "reason", "details", "status", "created_at")
        read_only_fields = fields


class ModerationActionSerializer(serializers.ModelSerializer):
    moderator = ModeratorUserSummarySerializer(read_only=True)

    class Meta:
        model = ModerationAction
        fields = (
            "id",
            "moderator",
            "action_type",
            "target_type",
            "target_id",
            "note",
            "created_at",
        )
        read_only_fields = fields


class ReportListSerializer(serializers.ModelSerializer):
    reporter = ModeratorUserSummarySerializer(read_only=True)

    class Meta:
        model = Report
        fields = (
            "id",
            "reporter",
            "target_type",
            "target_id",
            "reason",
            "status",
            "created_at",
            "resolved_at",
        )
        read_only_fields = fields


class ReportDetailSerializer(ReportListSerializer):
    actions = ModerationActionSerializer(many=True, read_only=True)
    target_comment = serializers.SerializerMethodField()

    class Meta(ReportListSerializer.Meta):
        fields = ReportListSerializer.Meta.fields + (
            "details",
            "target_comment",
            "actions",
        )

    def get_target_comment(self, report):
        if report.target_type != Report.TargetType.COMMENT:
            return None

        try:
            comment = Comment.objects.select_related("author").get(pk=report.target_id)
        except Comment.DoesNotExist:
            return None

        return {
            "id": comment.id,
            "author": {
                "id": comment.author_id,
                "display_name": comment.author.display_name,
            },
            "body": comment.body,
            "status": comment.status,
            "created_at": comment.created_at,
            "updated_at": comment.updated_at,
        }


class ModerationNoteSerializer(serializers.Serializer):
    note = serializers.CharField(
        required=False,
        allow_blank=True,
        trim_whitespace=True,
        max_length=2000,
    )


class ReportStatusFilterSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=Report.Status.choices,
        required=False,
    )
