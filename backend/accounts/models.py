from django.contrib.auth.models import AbstractUser
from django.db import models

from .managers import UserManager


class User(AbstractUser):
    class Language(models.TextChoices):
        PERSIAN = "fa", "Persian"
        ENGLISH = "en", "English"

    username = None
    email = models.EmailField("email address", unique=True)
    display_name = models.CharField(max_length=150, blank=True)
    preferred_ui_language = models.CharField(
        max_length=2,
        choices=Language.choices,
        default=Language.PERSIAN,
    )

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()


class UserInterest(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="interests",
    )
    topic = models.ForeignKey(
        "content.Topic",
        on_delete=models.CASCADE,
        related_name="interested_users",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=("user", "topic"),
                name="accounts_userinterest_user_topic_unique",
            ),
        ]
