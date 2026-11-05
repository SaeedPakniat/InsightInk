from django.db.models import Prefetch

from .models import Idea, Topic


def public_idea_queryset():
    """Return the optimized queryset used by public Idea read surfaces."""
    return (
        Idea.objects.filter(status=Idea.IdeaStatus.PUBLISHED)
        .select_related("creator", "creator__user", "source")
        .prefetch_related(
            Prefetch(
                "topics",
                queryset=Topic.objects.filter(is_active=True).order_by("id"),
                to_attr="active_topics",
            )
        )
    )
