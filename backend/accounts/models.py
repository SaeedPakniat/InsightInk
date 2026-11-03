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
