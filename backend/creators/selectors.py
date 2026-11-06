from django.db.models import Count, Exists, OuterRef, Q

from content.models import Idea

from .models import CreatorFollow, CreatorProfile


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


def viewer_creator_follow_state(*, user, creator_ids):
    follow_exists = CreatorFollow.objects.filter(
        user=user,
        creator_id=OuterRef("pk"),
    )

    rows = (
        CreatorProfile.objects.filter(pk__in=creator_ids)
        .annotate(viewer_following=Exists(follow_exists))
        .values("id", "user_id", "viewer_following")
    )

    by_id = {}
    for row in rows:
        is_self = row["user_id"] == user.id
        by_id[row["id"]] = {
            "creator_id": row["id"],
            "following": False if is_self else row["viewer_following"],
            "can_follow": not is_self,
        }

    return [
        by_id[creator_id]
        for creator_id in creator_ids
        if creator_id in by_id
    ]
