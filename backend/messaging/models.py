from django.conf import settings
from django.db import models

from creators.models import CreatorProfile


class Conversation(models.Model):
    reader = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reader_conversations",
    )
    creator = models.ForeignKey(
        CreatorProfile,
        on_delete=models.CASCADE,
        related_name="direct_conversations",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True, db_index=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=("reader", "creator"),
                name="messaging_conversation_reader_creator_unique",
            ),
        ]
        indexes = [
            models.Index(
                fields=("-updated_at", "-id"),
                name="messaging_conv_recent_idx",
            ),
        ]

    def is_participant(self, user):
        user_id = getattr(user, "id", None)
        return bool(
            user_id
            and (
                user_id == self.reader_id
                or user_id == self.creator.user_id
            )
        )


class Message(models.Model):
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="direct_messages_sent",
    )
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True, db_index=True)

    class Meta:
        indexes = [
            models.Index(
                fields=("conversation", "-id"),
                name="messaging_msg_history_idx",
            ),
        ]

    def __str__(self):
        return f"Message {self.pk} in conversation {self.conversation_id}"
