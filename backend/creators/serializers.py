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
