from django.db.models import Count

from accounts.models import UserInterest
from content.models import Idea
from content.selectors import public_idea_queryset
from creators.models import CreatorFollow
from engagement.models import SavedIdea, Spark


CANDIDATE_LIMIT = 200
RELATED_CANDIDATE_LIMIT = 100


def recommendation_candidates(language_codes=None):
    queryset = public_idea_queryset()
    if language_codes is not None:
        queryset = queryset.filter(language__in=language_codes)

    return list(
        queryset
        .annotate(recommendation_spark_count=Count("sparks", distinct=True))
        .order_by("-id")[:CANDIDATE_LIMIT]
    )


def related_candidates(idea, language_codes=None):
    topic_ids = [topic.id for topic in idea.active_topics]
    if not topic_ids:
        return []

    queryset = (
        public_idea_queryset()
        .filter(topics__id__in=topic_ids)
        .exclude(pk=idea.pk)
    )
    if language_codes is not None:
        queryset = queryset.filter(language__in=language_codes)

    return list(
        queryset
        .annotate(recommendation_spark_count=Count("sparks", distinct=True))
        .distinct()
        .order_by("-id")[:RELATED_CANDIDATE_LIMIT]
    )


def interest_topic_ids(user):
    return set(
        UserInterest.objects.filter(user=user, topic__is_active=True)
        .values_list("topic_id", flat=True)
    )


def _topic_counts_for_interactions(model, user):
    rows = (
        model.objects.filter(
            user=user,
            idea__status=Idea.IdeaStatus.PUBLISHED,
            idea__topics__is_active=True,
        )
        .values("idea__topics")
        .annotate(total=Count("idea_id", distinct=True))
    )
    return {row["idea__topics"]: row["total"] for row in rows}


def saved_topic_counts(user):
    return _topic_counts_for_interactions(SavedIdea, user)


def sparked_topic_counts(user):
    return _topic_counts_for_interactions(Spark, user)


def followed_creator_ids(user):
    return set(
        CreatorFollow.objects.filter(user=user).values_list(
            "creator_id",
            flat=True,
        )
    )
