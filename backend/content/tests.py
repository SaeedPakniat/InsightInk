from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.db.models.deletion import ProtectedError
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from creators.models import CreatorProfile

from .models import Idea, Source, Topic


class ContentModelTestCase(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            email="content-creator@example.com",
            password="test-password",
        )
        self.creator = CreatorProfile.objects.create(user=self.user)
        self.source = Source.objects.create(
            type=Source.SourceType.BOOK,
            title="A Source",
            language="fa-IR",
        )

    def create_idea(self, **overrides):
        values = {
            "creator": self.creator,
            "source": self.source,
            "language": "fa-IR",
            "title": "An Idea",
            "body": "The idea body.",
            "estimated_read_seconds": 60,
        }
        values.update(overrides)
        return Idea.objects.create(**values)


class TopicModelTests(ContentModelTestCase):
    def test_topic_can_be_created(self):
        topic = Topic.objects.create(
            slug="technology",
            name_fa="فناوری",
            name_en="Technology",
        )

        self.assertEqual(topic.slug, "technology")
        self.assertTrue(topic.is_active)

    def test_topic_slug_must_be_unique(self):
        Topic.objects.create(slug="technology", name_fa="فناوری", name_en="Technology")

        with self.assertRaises(IntegrityError), transaction.atomic():
            Topic.objects.create(
                slug="technology",
                name_fa="فناوری دوم",
                name_en="Technology Two",
            )


class TopicAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.active_topic = Topic.objects.create(
            slug="technology",
            name_fa="فناوری",
            name_en="Technology",
        )
        self.inactive_topic = Topic.objects.create(
            slug="inactive-topic",
            name_fa="غیرفعال",
            name_en="Inactive",
            is_active=False,
        )
        self.list_url = reverse("api:topic-list")

    def test_anonymous_list_returns_active_topics_with_public_fields(self):
        response = APIClient().get(self.list_url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            [
                {
                    "id": self.active_topic.id,
                    "slug": "technology",
                    "name_fa": "فناوری",
                    "name_en": "Technology",
                }
            ],
        )
        self.assertNotIn("is_active", response.json()[0])

    def test_list_is_ordered_by_id(self):
        second_active_topic = Topic.objects.create(
            slug="science",
            name_fa="علم",
            name_en="Science",
        )

        response = self.client.get(self.list_url)

        self.assertEqual(
            [topic["id"] for topic in response.json()],
            [self.active_topic.id, second_active_topic.id],
        )

    def test_active_topic_detail_returns_public_contract(self):
        url = reverse("api:topic-detail", args=[self.active_topic.id])

        response = APIClient().get(url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "id": self.active_topic.id,
                "slug": "technology",
                "name_fa": "فناوری",
                "name_en": "Technology",
            },
        )

    def test_inactive_topic_detail_returns_404(self):
        url = reverse("api:topic-detail", args=[self.inactive_topic.id])

        response = self.client.get(url)

        self.assertEqual(response.status_code, 404)

    def test_missing_topic_detail_returns_404(self):
        url = reverse("api:topic-detail", args=[self.inactive_topic.id + 1000])

        response = self.client.get(url)

        self.assertEqual(response.status_code, 404)

    def test_post_is_rejected(self):
        response = self.client.post(
            self.list_url,
            data={"slug": "new", "name_fa": "جدید", "name_en": "New"},
        )

        self.assertEqual(response.status_code, 405)

    def test_detail_write_methods_are_rejected(self):
        url = reverse("api:topic-detail", args=[self.active_topic.id])

        for method in ("put", "patch", "delete"):
            with self.subTest(method=method):
                response = getattr(self.client, method)(url, data={})

                self.assertEqual(response.status_code, 405)


class SourceModelTests(ContentModelTestCase):
    def test_source_can_be_created_with_optional_fields_blank(self):
        source = Source.objects.create(
            type=Source.SourceType.ARTICLE,
            title="An Article",
            language="en-US",
        )

        self.assertEqual(source.original_creator_text, "")
        self.assertEqual(source.external_url, "")
        self.assertEqual(source.cover, "")
        self.assertEqual(source.metadata, {})

    def test_source_type_values_are_exact(self):
        self.assertEqual(
            list(Source.SourceType.values),
            ["book", "article", "movie", "podcast"],
        )

    def test_invalid_source_type_is_rejected_by_model_validation(self):
        source = Source(type="video", title="Invalid Source", language="en")

        with self.assertRaises(ValidationError):
            source.full_clean()


class SourceAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.source = Source.objects.create(
            type=Source.SourceType.BOOK,
            title="The Book",
            original_creator_text="The Author",
            language="en",
            external_url="https://example.com/book",
            cover="https://example.com/cover.jpg",
            metadata={"isbn": "not-public"},
        )
        self.list_url = reverse("api:source-list")

    def test_anonymous_list_returns_only_public_fields(self):
        response = APIClient().get(self.list_url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            [
                {
                    "id": self.source.id,
                    "type": "book",
                    "title": "The Book",
                    "original_creator_text": "The Author",
                    "language": "en",
                    "external_url": "https://example.com/book",
                    "cover": "https://example.com/cover.jpg",
                }
            ],
        )
        self.assertNotIn("metadata", response.json()[0])

    def test_list_is_ordered_by_id(self):
        second_source = Source.objects.create(
            type=Source.SourceType.ARTICLE,
            title="The Article",
            language="fa",
        )

        response = self.client.get(self.list_url)

        self.assertEqual(
            [source["id"] for source in response.json()],
            [self.source.id, second_source.id],
        )

    def test_detail_returns_public_contract(self):
        url = reverse("api:source-detail", args=[self.source.id])

        response = APIClient().get(url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            set(response.json()),
            {
                "id",
                "type",
                "title",
                "original_creator_text",
                "language",
                "external_url",
                "cover",
            },
        )
        self.assertNotIn("metadata", response.json())

    def test_missing_detail_returns_404(self):
        url = reverse("api:source-detail", args=[self.source.id + 1000])

        response = self.client.get(url)

        self.assertEqual(response.status_code, 404)

    def test_source_type_values_are_returned_unchanged(self):
        expected_types = list(Source.SourceType.values)
        for source_type in expected_types[1:]:
            Source.objects.create(
                type=source_type,
                title=f"A {source_type}",
                language="en",
            )

        response = self.client.get(self.list_url)

        self.assertEqual(
            [source["type"] for source in response.json()],
            expected_types,
        )

    def test_optional_fields_may_be_blank(self):
        source = Source.objects.create(
            type=Source.SourceType.PODCAST,
            title="A Podcast",
            language="fa",
        )
        url = reverse("api:source-detail", args=[source.id])

        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["original_creator_text"], "")
        self.assertEqual(response.json()["external_url"], "")
        self.assertEqual(response.json()["cover"], "")

    def test_post_is_rejected(self):
        response = self.client.post(
            self.list_url,
            data={"type": "book", "title": "New", "language": "en"},
        )

        self.assertEqual(response.status_code, 405)

    def test_detail_write_methods_are_rejected(self):
        url = reverse("api:source-detail", args=[self.source.id])

        for method in ("put", "patch", "delete"):
            with self.subTest(method=method):
                response = getattr(self.client, method)(url, data={})

                self.assertEqual(response.status_code, 405)

    def test_existing_topic_and_health_apis_still_work(self):
        Topic.objects.create(
            slug="technology",
            name_fa="فناوری",
            name_en="Technology",
        )

        topic_response = self.client.get(reverse("api:topic-list"))
        health_response = self.client.get(reverse("api:health"))

        self.assertEqual(topic_response.status_code, 200)
        self.assertEqual(health_response.status_code, 200)
        self.assertEqual(health_response.json(), {"status": "ok"})


class IdeaAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(
            email="creator@example.com",
            password="test-password",
            display_name="Public Creator",
            preferred_ui_language="en",
            is_staff=True,
        )
        self.creator = CreatorProfile.objects.create(
            user=self.user,
            avatar="creator_avatars/public.png",
            is_verified=True,
            bio_en="Private biography",
        )
        self.source = Source.objects.create(
            type=Source.SourceType.BOOK,
            title="The Public Source",
            original_creator_text="Source Author",
            language="en",
            external_url="https://example.com/source",
            cover="https://example.com/cover.jpg",
            metadata={"isbn": "private-metadata"},
        )
        self.active_topic = Topic.objects.create(
            slug="active-topic",
            name_fa="موضوع فعال",
            name_en="Active Topic",
        )
        self.inactive_topic = Topic.objects.create(
            slug="inactive-topic",
            name_fa="موضوع غیرفعال",
            name_en="Inactive Topic",
            is_active=False,
        )
        self.published_idea = self.create_idea(
            title="Published Idea",
            status=Idea.IdeaStatus.PUBLISHED,
            published_at=timezone.now(),
        )
        self.published_idea.topics.add(self.active_topic, self.inactive_topic)
        self.draft_idea = self.create_idea(
            title="Draft Idea",
            status=Idea.IdeaStatus.DRAFT,
        )
        self.hidden_idea = self.create_idea(
            title="Hidden Idea",
            status=Idea.IdeaStatus.HIDDEN,
        )
        self.list_url = reverse("api:idea-list")

    def create_idea(self, **overrides):
        values = {
            "creator": self.creator,
            "source": self.source,
            "language": "en",
            "title": "An Idea",
            "body": "The public idea body.",
            "estimated_read_seconds": 90,
        }
        values.update(overrides)
        return Idea.objects.create(**values)

    def test_anonymous_list_returns_only_published_ideas_in_descending_id_order(self):
        newer_published_idea = self.create_idea(
            title="Newer Published Idea",
            status=Idea.IdeaStatus.PUBLISHED,
        )

        response = APIClient().get(self.list_url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [idea["id"] for idea in response.json()],
            [newer_published_idea.id, self.published_idea.id],
        )
        self.assertNotIn(self.draft_idea.id, [idea["id"] for idea in response.json()])
        self.assertNotIn(self.hidden_idea.id, [idea["id"] for idea in response.json()])

    def test_list_exposes_exact_public_fields(self):
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            set(response.json()[0]),
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
        self.assertTrue(
            {"status", "created_at", "updated_at"}.isdisjoint(response.json()[0])
        )

    def test_creator_summary_is_safe_and_minimal(self):
        creator = self.client.get(self.list_url).json()[0]["creator"]

        self.assertEqual(
            set(creator), {"id", "display_name", "avatar", "is_verified"}
        )
        self.assertEqual(creator["id"], self.creator.id)
        self.assertEqual(creator["display_name"], "Public Creator")
        self.assertTrue(creator["avatar"].endswith("/creator_avatars/public.png"))
        self.assertTrue(creator["is_verified"])
        self.assertTrue(
            {
                "username",
                "email",
                "password",
                "preferred_ui_language",
                "is_staff",
                "is_superuser",
                "bio_fa",
                "bio_en",
                "created_at",
            }.isdisjoint(creator)
        )

    def test_source_uses_existing_public_contract_without_metadata(self):
        source = self.client.get(self.list_url).json()[0]["source"]

        self.assertEqual(
            set(source),
            {
                "id",
                "type",
                "title",
                "original_creator_text",
                "language",
                "external_url",
                "cover",
            },
        )
        self.assertNotIn("metadata", source)

    def test_only_active_topics_are_nested(self):
        topics = self.client.get(self.list_url).json()[0]["topics"]

        self.assertEqual(
            topics,
            [
                {
                    "id": self.active_topic.id,
                    "slug": "active-topic",
                    "name_fa": "موضوع فعال",
                    "name_en": "Active Topic",
                }
            ],
        )

    def test_idea_may_have_an_empty_topic_list(self):
        idea = self.create_idea(
            title="No Topics",
            status=Idea.IdeaStatus.PUBLISHED,
        )

        response = self.client.get(reverse("api:idea-detail", args=[idea.id]))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["topics"], [])

    def test_published_detail_returns_public_contract(self):
        response = APIClient().get(
            reverse("api:idea-detail", args=[self.published_idea.id])
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["id"], self.published_idea.id)
        self.assertEqual(response.json()["title"], "Published Idea")

    def test_missing_detail_returns_404(self):
        response = self.client.get(
            reverse("api:idea-detail", args=[self.hidden_idea.id + 1000])
        )

        self.assertEqual(response.status_code, 404)

    def test_draft_detail_returns_404(self):
        response = self.client.get(
            reverse("api:idea-detail", args=[self.draft_idea.id])
        )

        self.assertEqual(response.status_code, 404)

    def test_hidden_detail_returns_404(self):
        response = self.client.get(
            reverse("api:idea-detail", args=[self.hidden_idea.id])
        )

        self.assertEqual(response.status_code, 404)

    def test_write_methods_are_rejected(self):
        detail_url = reverse("api:idea-detail", args=[self.published_idea.id])

        self.assertEqual(self.client.post(self.list_url, data={}).status_code, 405)
        for method in ("put", "patch", "delete"):
            with self.subTest(method=method):
                response = getattr(self.client, method)(detail_url, data={})

                self.assertEqual(response.status_code, 405)

    def test_existing_topic_source_and_health_apis_still_work(self):
        topic_response = self.client.get(reverse("api:topic-list"))
        source_response = self.client.get(reverse("api:source-list"))
        health_response = self.client.get(reverse("api:health"))

        self.assertEqual(topic_response.status_code, 200)
        self.assertEqual(source_response.status_code, 200)
        self.assertEqual(health_response.status_code, 200)
        self.assertEqual(health_response.json(), {"status": "ok"})

    def test_list_nested_serialization_uses_two_queries(self):
        second_user = get_user_model().objects.create_user(
            email="second-creator@example.com",
            display_name="Second Creator",
        )
        second_creator = CreatorProfile.objects.create(user=second_user)
        second_source = Source.objects.create(
            type=Source.SourceType.PODCAST,
            title="Second Source",
            language="fa",
        )
        second_idea = self.create_idea(
            creator=second_creator,
            source=second_source,
            title="Second Published Idea",
            status=Idea.IdeaStatus.PUBLISHED,
        )
        second_idea.topics.add(self.active_topic)

        with self.assertNumQueries(2):
            response = self.client.get(self.list_url)
            self.assertEqual(response.status_code, 200)
            self.assertEqual(len(response.json()), 2)


class IdeaModelTests(ContentModelTestCase):
    def test_draft_idea_has_documented_defaults_and_relationships(self):
        idea = self.create_idea()

        self.assertEqual(idea.status, Idea.IdeaStatus.DRAFT)
        self.assertIsNone(idea.published_at)
        self.assertEqual(idea.creator, self.creator)
        self.assertIsInstance(idea.creator, CreatorProfile)
        self.assertEqual(idea.source, self.source)
        self.assertEqual(idea.topics.count(), 0)

    def test_plain_user_cannot_be_assigned_as_creator(self):
        with self.assertRaises(ValueError):
            self.create_idea(creator=self.user)

    def test_topics_many_to_many_relationship(self):
        topic = Topic.objects.create(
            slug="science",
            name_fa="علم",
            name_en="Science",
        )
        idea = self.create_idea()

        idea.topics.add(topic)

        self.assertQuerySetEqual(idea.topics.all(), [topic])
        self.assertQuerySetEqual(topic.ideas.all(), [idea])

    def test_estimated_read_seconds_must_be_greater_than_zero(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            self.create_idea(estimated_read_seconds=0)

    def test_creator_deletion_is_protected(self):
        idea = self.create_idea()

        with self.assertRaises(ProtectedError):
            self.creator.delete()

        self.assertTrue(Idea.objects.filter(pk=idea.pk).exists())

    def test_source_deletion_is_protected(self):
        idea = self.create_idea()

        with self.assertRaises(ProtectedError):
            self.source.delete()

        self.assertTrue(Idea.objects.filter(pk=idea.pk).exists())
