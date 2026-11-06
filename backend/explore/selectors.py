from django.db.models import Q

from content.models import Topic
from content.selectors import public_idea_queryset

from .normalization import normalize_search_text, normalized_search_expression


def search_public_ideas(
    *,
    query="",
    language_codes=None,
    source_type=None,
    topic_slug=None,
):
    queryset = public_idea_queryset()

    normalized_query = normalize_search_text(query)
    if normalized_query:
        queryset = queryset.alias(
            search_title=normalized_search_expression("title"),
            search_body=normalized_search_expression("body"),
            search_source_title=normalized_search_expression("source__title"),
            search_source_creator=normalized_search_expression(
                "source__original_creator_text"
            ),
            search_creator_name=normalized_search_expression(
                "creator__user__display_name"
            ),
            search_topic_fa=normalized_search_expression("topics__name_fa"),
            search_topic_en=normalized_search_expression("topics__name_en"),
        ).filter(
            Q(search_title__icontains=normalized_query)
            | Q(search_body__icontains=normalized_query)
            | Q(search_source_title__icontains=normalized_query)
            | Q(search_source_creator__icontains=normalized_query)
            | Q(search_creator_name__icontains=normalized_query)
            | Q(search_topic_fa__icontains=normalized_query)
            | Q(search_topic_en__icontains=normalized_query)
        )

    if language_codes is not None:
        queryset = queryset.filter(language__in=language_codes)

    if source_type:
        queryset = queryset.filter(source__type=source_type)

    if topic_slug:
        queryset = queryset.filter(
            topics__slug=topic_slug,
            topics__is_active=True,
        )

    return queryset.distinct().order_by("-id")


def published_ideas_for_active_topic(slug, *, language_codes=None):
    topic = Topic.objects.filter(slug=slug, is_active=True).first()
    if topic is None:
        return None, public_idea_queryset().none()

    queryset = public_idea_queryset().filter(topics=topic)
    if language_codes is not None:
        queryset = queryset.filter(language__in=language_codes)
    queryset = queryset.distinct().order_by("-id")
    return topic, queryset
