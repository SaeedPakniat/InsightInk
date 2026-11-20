from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Notification


User = get_user_model()


class NotificationActorSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "display_name")
        read_only_fields = fields


class NotificationSerializer(serializers.ModelSerializer):
    actor = NotificationActorSerializer(read_only=True)
    target = serializers.SerializerMethodField()
    is_read = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = (
            "id",
            "type",
            "actor",
            "target",
            "created_at",
            "read_at",
            "is_read",
        )
        read_only_fields = fields

    def get_is_read(self, notification):
        return notification.read_at is not None

    def get_target(self, notification):
        if notification.type == Notification.Type.MESSAGE_RECEIVED:
            if notification.message_id is None:
                return None
            return {
                "message_id": notification.message_id,
                "conversation_id": notification.message.conversation_id,
            }

        if notification.type == Notification.Type.CREATOR_FOLLOWED:
            if notification.creator_id is None:
                return None
            return {"creator_id": notification.creator_id}

        if notification.type == Notification.Type.COMMENT_RECEIVED:
            if notification.comment_id is None:
                return None
            return {
                "comment_id": notification.comment_id,
                "idea_id": notification.comment.idea_id,
            }

        if notification.type in {
            Notification.Type.IDEA_HIDDEN,
            Notification.Type.IDEA_RESTORED,
        }:
            if notification.idea_id is None:
                return None
            return {
                "idea_id": notification.idea_id,
                "title": notification.idea.title,
            }

        return None


class NotificationUnreadCountSerializer(serializers.Serializer):
    unread_count = serializers.IntegerField(read_only=True)


class NotificationReadAllResultSerializer(serializers.Serializer):
    marked_read = serializers.IntegerField(read_only=True)
    read_at = serializers.DateTimeField(read_only=True)
