from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Language(models.TextChoices):
        PERSIAN = "fa", "Persian"
        ENGLISH = "en", "English"

    display_name = models.CharField(max_length=150, blank=True)
    preferred_ui_language = models.CharField(
        max_length=2,
        choices=Language.choices,
        default=Language.PERSIAN,
    )
