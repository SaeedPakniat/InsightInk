from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.db.models.deletion import ProtectedError
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from creators.models import CreatorProfile

from .models import Idea, Source, Topic


class ContentModelTestCase(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="content-creator",
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
