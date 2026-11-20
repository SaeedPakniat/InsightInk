from django.conf import settings
from django.db import models


class Notification(models.Model):
    class Type(models.TextChoices):
        MESSAGE_RECEIVED = "message_received", "Message received"
        CREATOR_FOLLOWED = "creator_followed", "Creator followed"
        COMMENT_RECEIVED = "comment_received", "Comment received"
        IDEA_HIDDEN = "idea_hidden", "Idea hidden"
        IDEA_RESTORED = "idea_restored", "Idea restored"

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    type = models.CharField(max_length=40, choices=Type.choices, db_index=True)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="notifications_as_actor",
    )
    message = models.ForeignKey(
        "messaging.Message",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="notifications",
    )
    creator = models.ForeignKey(
        "creators.CreatorProfile",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="notifications",
    )
    comment = models.ForeignKey(
        "engagement.Comment",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="notifications",
    )
    idea = models.ForeignKey(
        "content.Idea",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="notifications",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True, db_index=True)

    class Meta:
        ordering = ("-created_at", "-id")
        indexes = [
            models.Index(
                fields=("recipient", "-created_at", "-id"),
                name="notif_recency_idx",
            ),
            models.Index(
                fields=("recipient", "read_at"),
                name="notif_unread_idx",
            ),
        ]
