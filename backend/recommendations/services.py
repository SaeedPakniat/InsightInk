from content.selectors import public_idea_queryset

from .explanations import recommendation_reason, related_reason
from .scoring import (
    FOLLOWED_CREATOR_WEIGHT,
    INTEREST_WEIGHT,
    SAVE_AFFINITY_WEIGHT,
    SPARK_AFFINITY_WEIGHT,
    freshness_score,
    jaccard_similarity,
    popularity_score,
    recommendation_score,
)
from .selectors import (
    followed_creator_ids,
    interest_topic_ids,
    recommendation_candidates,
    related_candidates,
    saved_topic_counts,
    sparked_topic_counts,
)


RECOMMENDATION_LIMIT = 20
RELATED_LIMIT = 10
RELATED_FORMAT_BONUS = 0.10
RELATED_POPULARITY_WEIGHT = 0.05
RELATED_FRESHNESS_WEIGHT = 0.05


def _best_topic_for_counts(topics, counts):
    return max(
        topics,
        key=lambda topic: (counts.get(topic.id, 0), -topic.id),
        default=None,
    )


def _dominant_recommendation_signal(
    *,
    topics,
    interest_ids,
    saved_counts,
    sparked_counts,
    followed,
    popularity,
    freshness,
):
    interest_topic = next(
        (topic for topic in topics if topic.id in interest_ids),
        None,
    )
    save_topic = _best_topic_for_counts(topics, saved_counts)
    spark_topic = _best_topic_for_counts(topics, sparked_counts)

    contributions = [
        ("interest", INTEREST_WEIGHT if interest_topic else 0.0, interest_topic),
        (
            "save",
            SAVE_AFFINITY_WEIGHT
            * min(saved_counts.get(save_topic.id, 0), 3)
            / 3
            if save_topic
            else 0.0,
            save_topic,
        ),
        (
            "spark",
            SPARK_AFFINITY_WEIGHT
            * min(sparked_counts.get(spark_topic.id, 0), 3)
            / 3
            if spark_topic
            else 0.0,
            spark_topic,
        ),
        ("follow", FOLLOWED_CREATOR_WEIGHT if followed else 0.0, None),
        ("popularity", popularity, None),
        ("freshness", freshness, None),
    ]
    return max(contributions, key=lambda item: item[1])


def recommendations_for_user(user, *, language_codes=None):
    interest_ids = interest_topic_ids(user)
    saved_counts = saved_topic_counts(user)
    sparked_counts = sparked_topic_counts(user)
    followed_ids = followed_creator_ids(user)
    language = user.preferred_ui_language

    results = []
    for idea in recommendation_candidates(language_codes=language_codes):
        topics = list(idea.active_topics)
        topic_ids = [topic.id for topic in topics]
        published_moment = idea.published_at or idea.created_at
        followed = idea.creator_id in followed_ids

        breakdown = recommendation_score(
            topic_ids=topic_ids,
            interest_topic_ids=interest_ids,
            saved_topic_counts=saved_counts,
            sparked_topic_counts=sparked_counts,
            followed_creator=followed,
            spark_count=idea.recommendation_spark_count,
            published_moment=published_moment,
        )

        dominant_signal, _, dominant_topic = _dominant_recommendation_signal(
            topics=topics,
            interest_ids=interest_ids,
            saved_counts=saved_counts,
            sparked_counts=sparked_counts,
            followed=followed,
            popularity=breakdown.popularity,
            freshness=breakdown.freshness,
        )
        results.append(
            {
                "idea": idea,
                "score": round(breakdown.total, 4),
                "reason": recommendation_reason(
                    language=language,
                    dominant_signal=dominant_signal,
                    topic=dominant_topic,
                    creator_name=idea.creator.user.display_name,
                ),
            }
        )

    results.sort(key=lambda item: (-item["score"], -item["idea"].id))
    return results[:RECOMMENDATION_LIMIT]


def related_ideas_for(idea, *, language_codes=None):
    source_topics = list(idea.active_topics)
    source_topic_ids = [topic.id for topic in source_topics]
    if not source_topic_ids:
        return []

    results = []
    for candidate in related_candidates(
        idea,
        language_codes=language_codes,
    ):
        candidate_topics = list(candidate.active_topics)
        candidate_topic_ids = [topic.id for topic in candidate_topics]
        shared_ids = set(source_topic_ids) & set(candidate_topic_ids)
        if not shared_ids:
            continue

        similarity = jaccard_similarity(source_topic_ids, candidate_topic_ids)
        different_format = candidate.source.type != idea.source.type
        popularity = popularity_score(candidate.recommendation_spark_count)
        freshness = freshness_score(candidate.published_at or candidate.created_at)
        score = (
            similarity
            + (RELATED_FORMAT_BONUS if different_format else 0.0)
            + RELATED_POPULARITY_WEIGHT * popularity
            + RELATED_FRESHNESS_WEIGHT * freshness
        )

        shared_topic = next(
            topic for topic in candidate_topics if topic.id in shared_ids
        )
        results.append(
            {
                "idea": candidate,
                "score": round(score, 4),
                "similarity": round(similarity, 4),
                "reason": related_reason(
                    idea_language=candidate.language,
                    shared_topic=shared_topic,
                    different_format=different_format,
                ),
            }
        )

    results.sort(key=lambda item: (-item["score"], -item["idea"].id))
    return results[:RELATED_LIMIT]