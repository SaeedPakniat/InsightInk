from django.contrib.auth import get_user_model
from rest_framework import serializers

from content.models import Idea
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
    target_idea = serializers.SerializerMethodField()

    class Meta(ReportListSerializer.Meta):
        fields = ReportListSerializer.Meta.fields + (
            "details",
            "target_comment",
            "target_idea",
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

    def get_target_idea(self, report):
        if report.target_type != Report.TargetType.IDEA:
            return None

        try:
            idea = (
                Idea.objects.select_related(
                    "creator",
                    "creator__user",
                    "source",
                )
                .get(pk=report.target_id)
            )
        except Idea.DoesNotExist:
            return None

        return {
            "id": idea.id,
            "title": idea.title,
            "body": idea.body,
            "language": idea.language,
            "status": idea.status,
            "creator": {
                "id": idea.creator_id,
                "display_name": idea.creator.user.display_name,
                "is_verified": idea.creator.is_verified,
            },
            "source": {
                "id": idea.source_id,
                "type": idea.source.type,
                "title": idea.source.title,
                "original_creator_text": idea.source.original_creator_text,
                "language": idea.source.language,
                "external_url": idea.source.external_url,
                "cover": idea.source.cover,
            },
            "published_at": idea.published_at,
        }


class IdeaModerationStateSerializer(serializers.Serializer):
    idea_id = serializers.IntegerField(read_only=True)
    status = serializers.CharField(read_only=True)
    action = serializers.ChoiceField(
        choices=(
            ModerationAction.ActionType.IDEA_HIDDEN,
            ModerationAction.ActionType.IDEA_RESTORED,
        ),
        read_only=True,
    )


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
