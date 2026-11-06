from io import StringIO

from django.core.management import call_command
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from accounts.models import User
from content.demo_seed_data import (
    DEMO_READER_LANGUAGES,
    DEMO_USERS,
    IDEAS,
    SOURCES,
    TOPICS,
)
from content.models import ContentLanguage, Idea, Source, Topic
from creators.models import CreatorProfile
from engagement.models import Comment, SavedIdea, Spark


class SeedDemoCommandTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed_demo", stdout=StringIO())

    def demo_source_count(self):
        return sum(
            1
            for source in Source.objects.all()
            if source.metadata.get("demo_seed_key")
        )

    def test_seed_creates_expected_topics_with_bilingual_names(self):
        seeded = Topic.objects.filter(slug__in=[item["slug"] for item in TOPICS])

        self.assertEqual(seeded.count(), len(TOPICS))
        self.assertEqual(seeded.filter(is_active=True).count(), len(TOPICS))
        for topic in seeded:
            self.assertTrue(topic.name_fa.strip())
            self.assertTrue(topic.name_en.strip())

    def test_seed_represents_all_supported_source_types(self):
        seeded_sources = [
            source
            for source in Source.objects.all()
            if source.metadata.get("demo_seed_key")
        ]

        self.assertEqual(len(seeded_sources), len(SOURCES))
        self.assertEqual(
            {source.type for source in seeded_sources},
            set(Source.SourceType.values),
        )
        self.assertTrue(all(source.cover == "" for source in seeded_sources))
        self.assertTrue(
            all(source.metadata.get("provenance_url") for source in seeded_sources)
        )

    def test_seed_creates_published_bilingual_ideas_with_topics(self):
        seeded_titles = [item["title"] for item in IDEAS]
        seeded = Idea.objects.filter(title__in=seeded_titles)

        self.assertEqual(seeded.count(), len(IDEAS))
        self.assertFalse(seeded.exclude(status=Idea.IdeaStatus.PUBLISHED).exists())
        self.assertTrue(seeded.filter(language="fa").exists())
        self.assertTrue(seeded.filter(language="en").exists())
        self.assertFalse(seeded.filter(topics__isnull=True).exists())
        self.assertFalse(seeded.filter(published_at__isnull=True).exists())
        self.assertFalse(seeded.filter(estimated_read_seconds__lte=0).exists())

    def test_seed_creates_demo_accounts_profiles_and_interaction_state(self):
        demo_emails = [item["email"] for item in DEMO_USERS]

        self.assertEqual(User.objects.filter(email__in=demo_emails).count(), len(DEMO_USERS))
        self.assertEqual(
            CreatorProfile.objects.filter(user__email__in=demo_emails).count(),
            4,
        )

        reader = User.objects.get(email="demo-reader@example.com")
        self.assertEqual(reader.interests.count(), 4)
        self.assertEqual(
            list(
                reader.content_language_preferences.order_by(
                    "language__display_order", "language_id"
                ).values_list("language_id", flat=True)
            ),
            [
                language.code
                for language in ContentLanguage.objects.filter(
                    code__in=DEMO_READER_LANGUAGES
                ).order_by("display_order", "code")
            ],
        )
        self.assertEqual(SavedIdea.objects.filter(user=reader).count(), 6)
        self.assertEqual(Spark.objects.filter(user=reader).count(), 6)
        self.assertEqual(reader.creator_follows.count(), 2)
        self.assertEqual(Comment.objects.filter(author=reader).count(), 3)

    def test_running_command_twice_does_not_duplicate_demo_records(self):
        before = {
            "topics": Topic.objects.filter(
                slug__in=[item["slug"] for item in TOPICS]
            ).count(),
            "sources": self.demo_source_count(),
            "ideas": Idea.objects.filter(
                title__in=[item["title"] for item in IDEAS]
            ).count(),
            "users": User.objects.filter(
                email__in=[item["email"] for item in DEMO_USERS]
            ).count(),
            "creators": CreatorProfile.objects.filter(
                user__email__in=[item["email"] for item in DEMO_USERS]
            ).count(),
        }

        call_command("seed_demo", stdout=StringIO())

        after = {
            "topics": Topic.objects.filter(
                slug__in=[item["slug"] for item in TOPICS]
            ).count(),
            "sources": self.demo_source_count(),
            "ideas": Idea.objects.filter(
                title__in=[item["title"] for item in IDEAS]
            ).count(),
            "users": User.objects.filter(
                email__in=[item["email"] for item in DEMO_USERS]
            ).count(),
            "creators": CreatorProfile.objects.filter(
                user__email__in=[item["email"] for item in DEMO_USERS]
            ).count(),
        }

        self.assertEqual(before, after)

    def test_command_preserves_unrelated_existing_records(self):
        unrelated_user = User.objects.create_user(email="real-user@example.com")
        unrelated_topic = Topic.objects.create(
            slug="unrelated-real-topic",
            name_fa="موضوع واقعی",
            name_en="Real Topic",
        )

        call_command("seed_demo", stdout=StringIO())

        self.assertTrue(User.objects.filter(pk=unrelated_user.pk).exists())
        self.assertTrue(Topic.objects.filter(pk=unrelated_topic.pk).exists())

    def test_public_topics_api_exposes_seeded_active_topics(self):
        response = APIClient().get(reverse("api:topic-list"))

        self.assertEqual(response.status_code, 200)
        returned_slugs = {item["slug"] for item in response.json()}
        self.assertTrue(
            {item["slug"] for item in TOPICS}.issubset(returned_slugs)
        )
        sample = next(item for item in response.json() if item["slug"] == "technology")
        self.assertEqual(
            sample,
            {
                "id": sample["id"],
                "slug": "technology",
                "name_fa": "فناوری",
                "name_en": "Technology",
            },
        )

    def test_public_ideas_api_exposes_seeded_published_ideas(self):
        response = APIClient().get(reverse("api:idea-list"))

        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(len(response.json()), 30)
        item = response.json()[0]
        self.assertEqual(
            set(item),
            {
                "id",
                "language",
                "title",
                "body",
                "estimated_read_seconds",
                "published_at",
                "creator",
                "source",
                "topics",
            },
        )

    def test_feed_api_exposes_realistic_paginated_seed_content(self):
        response = APIClient().get(reverse("api:feed"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(set(response.json()), {"next", "previous", "results"})
        self.assertEqual(len(response.json()["results"]), 10)

        item = response.json()["results"][0]
        self.assertTrue(
            ContentLanguage.objects.filter(
                code=item["language"],
                is_active=True,
            ).exists()
        )
        self.assertTrue(item["creator"]["display_name"])
        self.assertTrue(item["source"]["title"])
        self.assertTrue(item["topics"])
        self.assertGreater(item["estimated_read_seconds"], 0)
        self.assertGreater(len(item["body"]), 80)

    def test_seeded_language_counts_cover_representative_multilingual_ui(self):
        seeded_titles = [item["title"] for item in IDEAS]
        seeded = Idea.objects.filter(title__in=seeded_titles)

        expected = {
            "en": 20,
            "fa": 20,
            "es": 4,
            "ar": 4,
            "ko": 4,
            "ja": 4,
            "zh": 4,
            "hi": 4,
            "tr": 3,
        }
        self.assertEqual(
            {
                code: seeded.filter(language=code).count()
                for code in expected
            },
            expected,
        )
