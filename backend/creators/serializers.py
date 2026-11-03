from rest_framework import serializers

from .models import CreatorProfile


class CreatorSummarySerializer(serializers.ModelSerializer):
    display_name = serializers.CharField(source="user.display_name", read_only=True)

    class Meta:
        model = CreatorProfile
        fields = ("id", "display_name", "avatar", "is_verified")
        read_only_fields = fields
