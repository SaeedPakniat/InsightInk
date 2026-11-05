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


class CreatorFollow(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="creator_follows",
    )
    creator = models.ForeignKey(
        CreatorProfile,
        on_delete=models.CASCADE,
        related_name="followers",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=("user", "creator"),
                name="creators_creatorfollow_user_creator_unique",
            ),
        ]
