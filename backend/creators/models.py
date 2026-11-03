from django.conf import settings
from django.db import models


class CreatorProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="creator_profile",
    )
    bio_fa = models.TextField(blank=True)
    bio_en = models.TextField(blank=True)
    avatar = models.FileField(upload_to="creator_avatars/", blank=True)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
