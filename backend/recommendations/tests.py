from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import SimpleTestCase, TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import User, UserInterest
from content.models import Idea, Source, Topic
from creators.models import CreatorFollow, CreatorProfile
from engagement.models import SavedIdea, Spark

from .scoring import (
    capped_topic_affinity,
    freshness_score,
    jaccard_similarity,
    popularity_score,
    recommendation_score,
)


class RecommendationScoringTests(SimpleTestCase):
    def test_topic_affinity_is_capped_and_normalized(self):
        self.assertEqual(
            capped_topic_affinity([1], {1: 1}),
            1 / 3,
        )
        self.assertEqual(
            capped_topic_affinity([1], {1: 99}),
            1.0,
        )

    def test_popularity_is_bounded_zero_to_one(self):
        self.assertEqual(popularity_score(0), 0.0)
        self.assertEqual(popularity_score(5), 0.5)
        self.assertEqual(popularity_score(500), 1.0)

    def test_freshness_decays_to_zero_over_thirty_days(self):
        now = timezone.now()

        self.assertAlmostEqual(freshness_score(now, now=now), 1.0)
        self.assertAlmostEqual(
            freshness_score(now - timedelta(days=15), now=now),
            0.5,
            places=4,
        )
        self.assertEqual(
            freshness_score(now - timedelta(days=60), now=now),
            0.0,
        )

    def test_jaccard_similarity(self):
        self.assertEqual(jaccard_similarity([1, 2, 3], [1, 2, 4]), 0.5)
        self.assertEqual(jaccard_similarity([], []), 0.0)

    def test_interest_match_has_documented_baseline_weight(self):
        now = timezone.now()

        matching = recommendation_score(
            topic_ids=[1],
            interest_topic_ids={1},
            saved_topic_counts={},
            sparked_topic_counts={},
            followed_creator=False,
            spark_count=0,
            published_moment=now,
            now=now,
        )
        unrelated = recommendation_score(
            topic_ids=[2],
            interest_topic_ids={1},
            saved_topic_counts={},
            sparked_topic_counts={},
            followed_creator=False,
            spark_count=0,
            published_moment=now,
            now=now,
        )

        self.assertEqual(matching.interest, 5.0)
        self.assertGreater(matching.total, unrelated.total)

    def test_language_and_seen_components_remain_zero_without_real_data(self):
        breakdown = recommendation_score(
            topic_ids=[],
            interest_topic_ids=set(),
            saved_topic_counts={},
            sparked_topic_counts={},
            followed_creator=False,
            spark_count=0,
            published_moment=None,
        )

        self.assertEqual(breakdown.language_fit, 0.0)
        self.assertEqual(breakdown.seen_penalty, 0.0)


class RecommendationAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="recommend-reader@example.com",
            preferred_ui_language=User.Language.ENGLISH,
        )
        self.creator_one_user = User.objects.create_user(
            email="recommend-creator-one@example.com",
            display_name="Creator One",
        )
        self.creator_two_user = User.objects.create_user(
            email="recommend-creator-two@example.com",
            display_name="Creator Two",
        )
        self.creator_one = CreatorProfile.objects.create(user=self.creator_one_user)
        self.creator_two = CreatorProfile.objects.create(user=self.creator_two_user)

        self.book = Source.objects.create(
            type=Source.SourceType.BOOK,
            title="Recommendation Book",
            language="en",
        )
        self.podcast = Source.objects.create(
            type=Source.SourceType.PODCAST,
            title="Recommendation Podcast",
            language="en",
        )

        self.science = Topic.objects.create(
            slug="recommend-science",
            name_fa="علم",
            name_en="Science",
        )
        self.history = Topic.objects.create(
            slug="recommend-history",
            name_fa="تاریخ",
            name_en="History",
        )
        self.focus = Topic.objects.create(
            slug="recommend-focus",
            name_fa="تمرکز",
            name_en="Focus",
        )

        now = timezone.now()
        self.science_idea = self.create_idea(
            creator=self.creator_one,
            source=self.book,
            title="Science candidate",
            topics=[self.science],
            published_at=now - timedelta(days=5),
        )
        self.history_idea = self.create_idea(
            creator=self.creator_two,
            source=self.book,
            title="History candidate",
            topics=[self.history],
            published_at=now - timedelta(days=5),
        )
        self.focus_idea = self.create_idea(
            creator=self.creator_two,
            source=self.podcast,
            title="Focus candidate",
            topics=[self.focus],
            published_at=now - timedelta(days=5),
        )
        self.draft = self.create_idea(
            creator=self.creator_one,
            source=self.book,
            title="Draft science",
            topics=[self.science],
            status=Idea.IdeaStatus.DRAFT,
            published_at=None,
        )
        self.hidden = self.create_idea(
            creator=self.creator_one,
            source=self.book,
            title="Hidden science",
            topics=[self.science],
            status=Idea.IdeaStatus.HIDDEN,
            published_at=None,
        )

        self.url = reverse("api:recommendations:recommendations")

    def create_idea(
        self,
        *,
        creator,
        source,
        title,
        topics,
        status=Idea.IdeaStatus.PUBLISHED,
        published_at=None,
    ):
        idea = Idea.objects.create(
            creator=creator,
            source=source,
            language="en",
            title=title,
            body="Recommendation body",
            estimated_read_seconds=60,
            status=status,
            published_at=published_at,
        )
        idea.topics.set(topics)
        return idea

    def response_by_id(self, response):
        return {
            item["idea"]["id"]: item
            for item in response.json()
        }

    def test_recommendations_require_authentication(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 403)

    def test_explicit_interest_boosts_matching_idea(self):
        UserInterest.objects.create(user=self.user, topic=self.science)
        self.client.force_login(self.user)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 200)
        items = self.response_by_id(response)
        self.assertGreater(
            items[self.science_idea.id]["score"],
            items[self.history_idea.id]["score"],
        )
        self.assertEqual(
            items[self.science_idea.id]["reason"],
            "Because you selected Science.",
        )

    def test_persian_ui_gets_persian_deterministic_explanation(self):
        self.user.preferred_ui_language = User.Language.PERSIAN
        self.user.save(update_fields=["preferred_ui_language"])
        UserInterest.objects.create(user=self.user, topic=self.science)
        self.client.force_login(self.user)

        response = self.client.get(self.url)

        item = self.response_by_id(response)[self.science_idea.id]
        self.assertIn("علم", item["reason"])
        self.assertTrue(item["reason"].startswith("چون"))

    def test_saved_topic_affinity_boosts_matching_topic(self):
        saved_one = self.create_idea(
            creator=self.creator_one,
            source=self.book,
            title="Saved Science One",
            topics=[self.science],
            published_at=timezone.now() - timedelta(days=10),
        )
        saved_two = self.create_idea(
            creator=self.creator_one,
            source=self.book,
            title="Saved Science Two",
            topics=[self.science],
            published_at=timezone.now() - timedelta(days=10),
        )
        SavedIdea.objects.create(user=self.user, idea=saved_one)
        SavedIdea.objects.create(user=self.user, idea=saved_two)
        self.client.force_login(self.user)

        response = self.client.get(self.url)

        items = self.response_by_id(response)
        self.assertGreater(
            items[self.science_idea.id]["score"],
            items[self.history_idea.id]["score"],
        )
        self.assertIn("saved ideas about Science", items[self.science_idea.id]["reason"])

    def test_sparked_topic_affinity_boosts_matching_topic(self):
        sparked_one = self.create_idea(
            creator=self.creator_two,
            source=self.podcast,
            title="Sparked Focus One",
            topics=[self.focus],
            published_at=timezone.now() - timedelta(days=10),
        )
        sparked_two = self.create_idea(
            creator=self.creator_two,
            source=self.podcast,
            title="Sparked Focus Two",
            topics=[self.focus],
            published_at=timezone.now() - timedelta(days=10),
        )
        Spark.objects.create(user=self.user, idea=sparked_one)
        Spark.objects.create(user=self.user, idea=sparked_two)
        self.client.force_login(self.user)

        response = self.client.get(self.url)

        items = self.response_by_id(response)
        self.assertGreater(
            items[self.focus_idea.id]["score"],
            items[self.history_idea.id]["score"],
        )
        self.assertIn("sparked ideas about Focus", items[self.focus_idea.id]["reason"])

    def test_followed_creator_signal_boosts_creator_ideas(self):
        CreatorFollow.objects.create(user=self.user, creator=self.creator_one)
        self.client.force_login(self.user)

        response = self.client.get(self.url)

        items = self.response_by_id(response)
        self.assertGreater(
            items[self.science_idea.id]["score"],
            items[self.history_idea.id]["score"],
        )
        self.assertEqual(
            items[self.science_idea.id]["reason"],
            "Because you follow Creator One.",
        )

    def test_popularity_contribution_is_bounded(self):
        for index in range(12):
            liker = User.objects.create_user(email=f"popular-{index}@example.com")
            Spark.objects.create(user=liker, idea=self.history_idea)

        self.client.force_login(self.user)
        response = self.client.get(self.url)
        items = self.response_by_id(response)

        self.assertLessEqual(items[self.history_idea.id]["score"], 2.0)

    def test_only_published_ideas_are_recommended(self):
        self.client.force_login(self.user)

        response = self.client.get(self.url)

        ids = set(self.response_by_id(response))
        self.assertNotIn(self.draft.id, ids)
        self.assertNotIn(self.hidden.id, ids)

    def test_results_are_deterministic_for_same_database_state(self):
        UserInterest.objects.create(user=self.user, topic=self.science)
        self.client.force_login(self.user)

        first = self.client.get(self.url)
        second = self.client.get(self.url)

        self.assertEqual(first.status_code, 200)
        self.assertEqual(first.json(), second.json())

    def test_response_contains_transparent_score_reason_and_safe_idea(self):
        self.client.force_login(self.user)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json())
        item = response.json()[0]
        self.assertEqual(set(item), {"idea", "score", "reason"})
        self.assertNotIn("status", item["idea"])


class RelatedIdeasAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        creator_user = User.objects.create_user(
            email="related-creator@example.com"
        )
        self.creator = CreatorProfile.objects.create(user=creator_user)
        self.book = Source.objects.create(
            type=Source.SourceType.BOOK,
            title="Related Book",
            language="en",
        )
        self.podcast = Source.objects.create(
            type=Source.SourceType.PODCAST,
            title="Related Podcast",
            language="en",
        )
        self.science = Topic.objects.create(
            slug="related-science",
            name_fa="علم",
            name_en="Science",
        )
        self.focus = Topic.objects.create(
            slug="related-focus",
            name_fa="تمرکز",
            name_en="Focus",
        )
        self.history = Topic.objects.create(
            slug="related-history",
            name_fa="تاریخ",
            name_en="History",
        )
        now = timezone.now()

        self.source_idea = self.create_idea(
            source=self.book,
            title="Source Idea",
            topics=[self.science, self.focus],
            published_at=now,
        )
        self.strong_match = self.create_idea(
            source=self.book,
            title="Strong Match",
            topics=[self.science, self.focus],
            published_at=now,
        )
        self.partial_same_format = self.create_idea(
            source=self.book,
            title="Partial Same",
            topics=[self.science],
            published_at=now,
        )
        self.partial_cross_format = self.create_idea(
            source=self.podcast,
            title="Partial Podcast",
            topics=[self.science],
            published_at=now,
        )
        self.unrelated = self.create_idea(
            source=self.podcast,
            title="Unrelated",
            topics=[self.history],
            published_at=now,
        )
        self.draft_related = self.create_idea(
            source=self.book,
            title="Draft related",
            topics=[self.science, self.focus],
            status=Idea.IdeaStatus.DRAFT,
            published_at=None,
        )
        self.url = reverse(
            "api:recommendations:idea-related",
            args=[self.source_idea.id],
        )

    def create_idea(
        self,
        *,
        source,
        title,
        topics,
        status=Idea.IdeaStatus.PUBLISHED,
        published_at=None,
        language="en",
    ):
        idea = Idea.objects.create(
            creator=self.creator,
            source=source,
            language=language,
            title=title,
            body="Related body",
            estimated_read_seconds=60,
            status=status,
            published_at=published_at,
        )
        idea.topics.set(topics)
        return idea

    def items_by_id(self, response):
        return {item["idea"]["id"]: item for item in response.json()}

    def test_related_endpoint_is_public(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 200)

    def test_jaccard_similarity_ranks_stronger_topic_overlap_first(self):
        response = self.client.get(self.url)

        ids = [item["idea"]["id"] for item in response.json()]
        self.assertEqual(ids[0], self.strong_match.id)
        items = self.items_by_id(response)
        self.assertEqual(items[self.strong_match.id]["similarity"], 1.0)
        self.assertEqual(items[self.partial_same_format.id]["similarity"], 0.5)

    def test_cross_format_gets_small_bonus_when_similarity_is_equal(self):
        response = self.client.get(self.url)

        items = self.items_by_id(response)
        self.assertGreater(
            items[self.partial_cross_format.id]["score"],
            items[self.partial_same_format.id]["score"],
        )
        self.assertIn("different format", items[self.partial_cross_format.id]["reason"])

    def test_unrelated_and_nonpublic_ideas_are_excluded(self):
        response = self.client.get(self.url)

        ids = set(self.items_by_id(response))
        self.assertNotIn(self.unrelated.id, ids)
        self.assertNotIn(self.draft_related.id, ids)

    def test_related_response_is_safe_and_explainable(self):
        response = self.client.get(self.url)

        item = response.json()[0]
        self.assertEqual(
            set(item),
            {"idea", "score", "similarity", "reason"},
        )
        self.assertNotIn("status", item["idea"])
        self.assertIn("Shared topic:", item["reason"])

    def test_persian_related_reason_uses_persian_topic_name(self):
        persian = self.create_idea(
            source=self.podcast,
            title="ایده فارسی",
            topics=[self.focus],
            published_at=timezone.now(),
            language="fa",
        )

        response = self.client.get(self.url)

        item = self.items_by_id(response)[persian.id]
        self.assertIn("تمرکز", item["reason"])
        self.assertIn("موضوع مشترک", item["reason"])

    def test_draft_source_idea_is_not_available_for_related(self):
        draft_url = reverse(
            "api:recommendations:idea-related",
            args=[self.draft_related.id],
        )

        response = self.client.get(draft_url)

        self.assertEqual(response.status_code, 404)

    def test_idea_without_topics_returns_empty_related_list(self):
        no_topics = self.create_idea(
            source=self.book,
            title="No Topics",
            topics=[],
            published_at=timezone.now(),
        )
        response = self.client.get(
            reverse(
                "api:recommendations:idea-related",
                args=[no_topics.id],
            )
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [])
