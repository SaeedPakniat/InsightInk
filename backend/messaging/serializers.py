from django.contrib.auth import get_user_model
from rest_framework import serializers

from creators.models import CreatorProfile

from .models import Message


User = get_user_model()


class MessageUserSummarySerializer(serializers.ModelSerializer):
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "display_name", "avatar_url")
        read_only_fields = fields

    def get_avatar_url(self, user):
        if not user.avatar:
            return None
        url = user.avatar.url
        request = self.context.get("request")
        return request.build_absolute_uri(url) if request is not None else url


class ConversationCreatorSummarySerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(read_only=True)
    display_name = serializers.CharField(
        source="user.display_name",
        read_only=True,
    )
    account_avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = CreatorProfile
        fields = (
            "id",
            "user_id",
            "display_name",
            "avatar",
            "account_avatar_url",
            "is_verified",
        )
        read_only_fields = fields

    def get_account_avatar_url(self, creator):
        user = creator.user
        if not user.avatar:
            return None
        url = user.avatar.url
        request = self.context.get("request")
        return request.build_absolute_uri(url) if request is not None else url


class ConversationStartSerializer(serializers.Serializer):
    creator_id = serializers.PrimaryKeyRelatedField(
        source="creator",
        queryset=CreatorProfile.objects.select_related("user"),
    )

    def validate_creator_id(self, creator):
        request = self.context["request"]
        if creator.user_id == request.user.id:
            raise serializers.ValidationError(
                "You cannot start a conversation with your own creator profile."
            )
        return creator


class MessageCreateSerializer(serializers.Serializer):
    body = serializers.CharField(
        trim_whitespace=True,
        allow_blank=False,
        max_length=4000,
    )


class MessageSerializer(serializers.ModelSerializer):
    sender = MessageUserSummarySerializer(read_only=True)
    is_read = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = (
            "id",
            "sender",
            "body",
            "created_at",
            "read_at",
            "is_read",
        )
        read_only_fields = fields

    def get_is_read(self, message):
        return message.read_at is not None


class ConversationSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    reader = MessageUserSummarySerializer(read_only=True)
    creator = ConversationCreatorSummarySerializer(read_only=True)
    viewer_role = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)

    def get_viewer_role(self, conversation):
        request = self.context.get("request")
        if request is None:
            return None
        return (
            "reader"
            if request.user.id == conversation.reader_id
            else "creator"
        )

    def get_last_message(self, conversation):
        message_id = getattr(conversation, "last_message_id", None)
        if message_id is None:
            return None

        body = getattr(conversation, "last_message_body", "") or ""
        excerpt = body if len(body) <= 160 else body[:159] + "…"
        read_at = getattr(conversation, "last_message_read_at", None)
        return {
            "id": message_id,
            "sender_id": getattr(
                conversation,
                "last_message_sender_id",
                None,
            ),
            "body_excerpt": excerpt,
            "created_at": getattr(
                conversation,
                "last_message_created_at",
                None,
            ),
            "read_at": read_at,
            "is_read": read_at is not None,
        }

    def get_unread_count(self, conversation):
        return int(getattr(conversation, "unread_count", 0))


class ConversationReadResultSerializer(serializers.Serializer):
    marked_read = serializers.IntegerField(read_only=True)
    unread_count = serializers.IntegerField(read_only=True)
    read_at = serializers.DateTimeField(read_only=True)
