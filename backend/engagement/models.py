from django.conf import settings
from django.db import models

from content.models import Idea


class Spark(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sparks",
    )
    idea = models.ForeignKey(
        Idea,
        on_delete=models.CASCADE,
        related_name="sparks",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=("user", "idea"),
                name="engagement_spark_user_idea_unique",
            ),
        ]


class SavedIdea(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="saved_ideas",
    )
    idea = models.ForeignKey(
        Idea,
        on_delete=models.CASCADE,
        related_name="saved_by",
    )
    saved_at = models.DateTimeField(auto_now_add=True)
    last_opened_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=("user", "idea"),
                name="engagement_savedidea_user_idea_unique",
            ),
        ]


class Comment(models.Model):
    class CommentStatus(models.TextChoices):
        VISIBLE = "visible", "Visible"
        HIDDEN = "hidden", "Hidden"
        DELETED = "deleted", "Deleted"

    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="comments",
    )
    idea = models.ForeignKey(
        Idea,
        on_delete=models.CASCADE,
        related_name="comments",
    )
    body = models.TextField()
    status = models.CharField(
        max_length=20,
        choices=CommentStatus.choices,
        default=CommentStatus.VISIBLE,
        db_index=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
