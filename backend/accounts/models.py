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
    avatar = models.ImageField(
        upload_to="user_avatars/",
        blank=True,
        null=True,
    )
    preferred_ui_language = models.CharField(
        max_length=2,
        choices=Language.choices,
        default=Language.PERSIAN,
    )

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()


class UserContentLanguage(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="content_language_preferences",
    )
    language = models.ForeignKey(
        "content.ContentLanguage",
        on_delete=models.PROTECT,
        related_name="reader_preferences",
        db_column="language_code",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=("user", "language"),
                name="accounts_usercontentlanguage_user_language_unique",
            ),
        ]


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
