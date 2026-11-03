from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.db.models.deletion import ProtectedError
from django.test import TestCase

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
