from django.db import transaction

from notifications.services import create_creator_followed_notification

from .models import CreatorFollow


@transaction.atomic
def follow_creator(*, user, creator):
    follow, created = CreatorFollow.objects.get_or_create(
        user=user,
        creator=creator,
    )
    if created:
        create_creator_followed_notification(follow=follow)
    return follow, created
