from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Comment


User = get_user_model()


class CommentAuthorSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "display_name")
        read_only_fields = fields


class CommentSerializer(serializers.ModelSerializer):
    author = CommentAuthorSerializer(read_only=True)
    body = serializers.CharField(
        trim_whitespace=True,
        allow_blank=False,
        max_length=4000,
    )

    class Meta:
        model = Comment
        fields = ("id", "author", "body", "created_at", "updated_at")
        read_only_fields = ("id", "author", "created_at", "updated_at")


class ViewerEngagementQuerySerializer(serializers.Serializer):
    idea_ids = serializers.CharField(
        required=True,
        allow_blank=False,
        trim_whitespace=True,
        error_messages={
            "required": "idea_ids query parameter is required.",
            "blank": "idea_ids query parameter must not be empty.",
        },
    )

    def validate_idea_ids(self, value):
        raw_items = value.split(",")
        if len(raw_items) > 100:
            raise serializers.ValidationError(
                "At most 100 Idea IDs may be requested."
            )

        normalized = []
        seen = set()
        for raw_item in raw_items:
            item = raw_item.strip()
            if not item or not item.isdecimal():
                raise serializers.ValidationError(
                    "idea_ids must be a comma-separated list of positive integers."
                )

            idea_id = int(item)
            if idea_id <= 0:
                raise serializers.ValidationError(
                    "idea_ids must be a comma-separated list of positive integers."
                )

            if idea_id not in seen:
                seen.add(idea_id)
                normalized.append(idea_id)

        return normalized


class ViewerEngagementItemSerializer(serializers.Serializer):
    idea_id = serializers.IntegerField(read_only=True)
    sparked = serializers.BooleanField(read_only=True)
    saved = serializers.BooleanField(read_only=True)


class ViewerEngagementResponseSerializer(serializers.Serializer):
    items = ViewerEngagementItemSerializer(many=True, read_only=True)
