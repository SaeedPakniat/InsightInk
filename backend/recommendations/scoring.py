from dataclasses import dataclass
from datetime import datetime

from django.utils import timezone


INTEREST_WEIGHT = 5.0
SAVE_AFFINITY_WEIGHT = 4.0
SPARK_AFFINITY_WEIGHT = 3.0
FOLLOWED_CREATOR_WEIGHT = 3.0
AFFINITY_CAP = 3
POPULARITY_CAP = 10
FRESHNESS_WINDOW_DAYS = 30


@dataclass(frozen=True)
class ScoreBreakdown:
    interest: float
    save_affinity: float
    spark_affinity: float
    followed_creator: float
    popularity: float
    freshness: float
    language_fit: float = 0.0
    seen_penalty: float = 0.0

    @property
    def total(self):
        return (
            self.interest
            + self.save_affinity
            + self.spark_affinity
            + self.followed_creator
            + self.popularity
            + self.freshness
            + self.language_fit
            - self.seen_penalty
        )


def capped_topic_affinity(topic_ids, counts_by_topic, *, cap=AFFINITY_CAP):
    if not topic_ids:
        return 0.0

    highest_count = max((counts_by_topic.get(topic_id, 0) for topic_id in topic_ids), default=0)
    if highest_count <= 0:
        return 0.0
    return min(highest_count, cap) / cap


def popularity_score(spark_count, *, cap=POPULARITY_CAP):
    if spark_count <= 0:
        return 0.0
    return min(spark_count, cap) / cap


def freshness_score(moment, *, now=None, window_days=FRESHNESS_WINDOW_DAYS):
    if moment is None:
        return 0.0

    now = now or timezone.now()
    if isinstance(moment, datetime) and timezone.is_naive(moment):
        moment = timezone.make_aware(moment, timezone.get_current_timezone())

    age_days = max(0.0, (now - moment).total_seconds() / 86400)
    return max(0.0, 1.0 - (age_days / window_days))


def recommendation_score(
    *,
    topic_ids,
    interest_topic_ids,
    saved_topic_counts,
    sparked_topic_counts,
    followed_creator,
    spark_count,
    published_moment,
    now=None,
):
    interest_match = bool(set(topic_ids) & set(interest_topic_ids))
    save_affinity = capped_topic_affinity(topic_ids, saved_topic_counts)
    spark_affinity = capped_topic_affinity(topic_ids, sparked_topic_counts)

    return ScoreBreakdown(
        interest=INTEREST_WEIGHT if interest_match else 0.0,
        save_affinity=SAVE_AFFINITY_WEIGHT * save_affinity,
        spark_affinity=SPARK_AFFINITY_WEIGHT * spark_affinity,
        followed_creator=FOLLOWED_CREATOR_WEIGHT if followed_creator else 0.0,
        popularity=popularity_score(spark_count),
        freshness=freshness_score(published_moment, now=now),
    )


def jaccard_similarity(topic_ids_a, topic_ids_b):
    set_a = set(topic_ids_a)
    set_b = set(topic_ids_b)
    union = set_a | set_b
    if not union:
        return 0.0
    return len(set_a & set_b) / len(union)
