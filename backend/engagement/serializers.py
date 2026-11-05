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
