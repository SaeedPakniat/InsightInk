from rest_framework import serializers

from .models import CreatorProfile


class CreatorSummarySerializer(serializers.ModelSerializer):
    display_name = serializers.CharField(source="user.display_name", read_only=True)

    class Meta:
        model = CreatorProfile
        fields = ("id", "display_name", "avatar", "is_verified")
        read_only_fields = fields


class CreatorProfileSelfSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(read_only=True)

    class Meta:
        model = CreatorProfile
        fields = (
            "id",
            "user_id",
            "bio_fa",
            "bio_en",
            "avatar",
            "is_verified",
            "created_at",
        )
        read_only_fields = ("id", "user_id", "is_verified", "created_at")


class CreatorPublicSerializer(serializers.ModelSerializer):
    display_name = serializers.CharField(source="user.display_name", read_only=True)
    follower_count = serializers.IntegerField(read_only=True)
    spark_count = serializers.IntegerField(read_only=True)
    idea_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = CreatorProfile
        fields = (
            "id",
            "display_name",
            "bio_fa",
            "bio_en",
            "avatar",
            "is_verified",
            "follower_count",
            "spark_count",
            "idea_count",
        )
        read_only_fields = fields


class ViewerCreatorFollowQuerySerializer(serializers.Serializer):
    creator_ids = serializers.CharField(
        required=True,
        allow_blank=False,
        trim_whitespace=True,
        error_messages={
            "required": "creator_ids query parameter is required.",
            "blank": "creator_ids query parameter must not be empty.",
        },
    )

    def validate_creator_ids(self, value):
        raw_items = value.split(",")
        if len(raw_items) > 100:
            raise serializers.ValidationError(
                "At most 100 CreatorProfile IDs may be requested."
            )

        normalized = []
        seen = set()
        for raw_item in raw_items:
            item = raw_item.strip()
            if not item or not item.isdecimal():
                raise serializers.ValidationError(
                    "creator_ids must be a comma-separated list of positive integers."
                )

            creator_id = int(item)
            if creator_id <= 0:
                raise serializers.ValidationError(
                    "creator_ids must be a comma-separated list of positive integers."
                )

            if creator_id not in seen:
                seen.add(creator_id)
                normalized.append(creator_id)

        return normalized


class ViewerCreatorFollowItemSerializer(serializers.Serializer):
    creator_id = serializers.IntegerField(read_only=True)
    following = serializers.BooleanField(read_only=True)
    can_follow = serializers.BooleanField(read_only=True)


class ViewerCreatorFollowResponseSerializer(serializers.Serializer):
    items = ViewerCreatorFollowItemSerializer(many=True, read_only=True)
