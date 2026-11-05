from django.db.models import Count, Q

from content.models import Idea

from .models import CreatorProfile


def public_creator_queryset():
    """Return public creator profiles with derived public reach counts."""
    return (
        CreatorProfile.objects.select_related("user")
        .annotate(
            follower_count=Count("followers", distinct=True),
            idea_count=Count(
                "ideas",
                filter=Q(ideas__status=Idea.IdeaStatus.PUBLISHED),
                distinct=True,
            ),
            spark_count=Count(
                "ideas__sparks",
                filter=Q(ideas__status=Idea.IdeaStatus.PUBLISHED),
                distinct=True,
            ),
        )
        .order_by("id")
    )
