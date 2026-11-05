from urllib.parse import urlsplit

from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser, Group
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.db.models.deletion import ProtectedError
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from creators.models import CreatorProfile
from creators.permissions import IsCreatorOwner
from accounts.permissions import MODERATOR_GROUP_NAME

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


class IdeaCreatorOwnershipPermissionTests(ContentModelTestCase):
    def setUp(self):
        super().setUp()
        self.idea = self.create_idea()
        self.other_user = get_user_model().objects.create_user(
            email="other-creator@example.com"
        )
        self.other_creator = CreatorProfile.objects.create(user=self.other_user)
        self.permission = IsCreatorOwner()

    @staticmethod
    def request_for(user):
        return type("Request", (), {"user": user})()

    def test_creator_owns_idea_linked_to_their_profile(self):
        request = self.request_for(self.user)

        self.assertTrue(self.permission.has_permission(request, None))
        self.assertTrue(self.permission.has_object_permission(request, None, self.idea))

    def test_creator_does_not_own_another_creators_idea(self):
        request = self.request_for(self.other_user)

        self.assertTrue(self.permission.has_permission(request, None))
        self.assertFalse(
            self.permission.has_object_permission(request, None, self.idea)
        )

    def test_reader_cannot_satisfy_creator_owner_permission(self):
        reader = get_user_model().objects.create_user(email="owner-reader@example.com")
        request = self.request_for(reader)

        self.assertFalse(self.permission.has_permission(request, None))
        self.assertFalse(
            self.permission.has_object_permission(request, None, self.idea)
        )

    def test_anonymous_cannot_satisfy_creator_owner_permission(self):
        request = self.request_for(AnonymousUser())

        self.assertFalse(self.permission.has_permission(request, None))
        self.assertFalse(
            self.permission.has_object_permission(request, None, self.idea)
        )

    def test_moderator_status_does_not_bypass_creator_ownership(self):
        self.other_user.is_staff = True
        self.other_user.save(update_fields=["is_staff"])
        self.other_user.groups.add(Group.objects.get(name=MODERATOR_GROUP_NAME))
        request = self.request_for(self.other_user)

        self.assertFalse(
            self.permission.has_object_permission(request, None, self.idea)
        )


class CreatorIdeaWorkspaceAPITests(TestCase):
    def setUp(self):
        self.client = APIClient(enforce_csrf_checks=True)
        self.creator_user = get_user_model().objects.create_user(
            email="workspace-creator@example.com"
        )
        self.creator = CreatorProfile.objects.create(user=self.creator_user)
        self.other_user = get_user_model().objects.create_user(
            email="workspace-other-creator@example.com"
        )
        self.other_creator = CreatorProfile.objects.create(user=self.other_user)
        self.reader = get_user_model().objects.create_user(
            email="workspace-reader@example.com"
        )
        self.source = Source.objects.create(
            type=Source.SourceType.BOOK,
            title="Workspace Source",
            language="en",
        )
        self.active_topic = Topic.objects.create(
            slug="workspace-active",
            name_fa="فعال",
            name_en="Active",
        )
        self.inactive_topic = Topic.objects.create(
            slug="workspace-inactive",
            name_fa="غیرفعال",
            name_en="Inactive",
            is_active=False,
        )
        self.list_url = reverse("api:creator-idea-list")
        self.csrf_url = reverse("api:accounts:csrf")

    def create_idea(self, *, creator=None, status=Idea.IdeaStatus.DRAFT, **overrides):
        values = {
            "creator": creator or self.creator,
            "source": self.source,
            "language": "en",
            "title": "Workspace Idea",
            "body": "Workspace body",
            "estimated_read_seconds": 75,
            "status": status,
        }
        values.update(overrides)
        return Idea.objects.create(**values)

    def csrf_token(self):
        response = self.client.get(self.csrf_url)
        self.assertEqual(response.status_code, 200)
        return response.json()["csrfToken"]

    def request_with_csrf(self, method, url, data=None):
        token = self.csrf_token()
        return getattr(self.client, method)(
            url,
            data=data or {},
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )

    def valid_payload(self, **overrides):
        values = {
            "language": "en",
            "title": "Draft title",
            "body": "Draft body",
            "estimated_read_seconds": 90,
            "source": self.source.id,
            "topics": [self.active_topic.id],
        }
        values.update(overrides)
        return values

    def test_reader_without_creator_profile_cannot_create_idea(self):
        self.client.force_login(self.reader)

        response = self.request_with_csrf("post", self.list_url, self.valid_payload())

        self.assertEqual(response.status_code, 403)
        self.assertFalse(Idea.objects.filter(creator__user=self.reader).exists())

    def test_creator_creates_draft_with_server_controlled_lifecycle_and_owner(self):
        self.client.force_login(self.creator_user)

        response = self.request_with_csrf(
            "post",
            self.list_url,
            self.valid_payload(
                creator=self.other_creator.id,
                status=Idea.IdeaStatus.PUBLISHED,
                published_at=timezone.now().isoformat(),
            ),
        )

        self.assertEqual(response.status_code, 201)
        idea = Idea.objects.get(pk=response.json()["id"])
        self.assertEqual(idea.creator, self.creator)
        self.assertEqual(idea.status, Idea.IdeaStatus.DRAFT)
        self.assertIsNone(idea.published_at)
        self.assertQuerySetEqual(idea.topics.all(), [self.active_topic])
        self.assertEqual(response.json()["status"], Idea.IdeaStatus.DRAFT)
        self.assertIsNone(response.json()["published_at"])

    def test_create_rejects_inactive_topic(self):
        self.client.force_login(self.creator_user)

        response = self.request_with_csrf(
            "post",
            self.list_url,
            self.valid_payload(topics=[self.inactive_topic.id]),
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("topics", response.json())

    def test_create_rejects_missing_source(self):
        self.client.force_login(self.creator_user)

        response = self.request_with_csrf(
            "post",
            self.list_url,
            self.valid_payload(source=self.source.id + 9999),
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("source", response.json())

    def test_create_rejects_non_positive_estimated_read_seconds(self):
        self.client.force_login(self.creator_user)

        response = self.request_with_csrf(
            "post",
            self.list_url,
            self.valid_payload(estimated_read_seconds=0),
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("estimated_read_seconds", response.json())

    def test_private_list_contains_all_own_statuses_and_not_other_creator(self):
        draft = self.create_idea(title="Draft")
        published = self.create_idea(
            status=Idea.IdeaStatus.PUBLISHED,
            title="Published",
        )
        hidden = self.create_idea(
            status=Idea.IdeaStatus.HIDDEN,
            title="Hidden",
        )
        self.create_idea(
            creator=self.other_creator,
            title="Other creator",
        )
        self.client.force_login(self.creator_user)

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [item["id"] for item in response.json()],
            [hidden.id, published.id, draft.id],
        )
        self.assertEqual(
            {item["status"] for item in response.json()},
            {
                Idea.IdeaStatus.DRAFT,
                Idea.IdeaStatus.PUBLISHED,
                Idea.IdeaStatus.HIDDEN,
            },
        )
        self.assertEqual(
            set(response.json()[0]),
            {
                "id",
                "language",
                "title",
                "body",
                "estimated_read_seconds",
                "status",
                "published_at",
                "created_at",
                "updated_at",
                "source",
                "topics",
            },
        )

    def test_private_detail_cannot_retrieve_another_creators_idea(self):
        other_idea = self.create_idea(creator=self.other_creator)
        self.client.force_login(self.creator_user)

        response = self.client.get(
            reverse("api:creator-idea-detail", args=[other_idea.id])
        )

        self.assertEqual(response.status_code, 404)

    def test_owner_can_patch_draft_but_cannot_change_lifecycle_or_owner(self):
        idea = self.create_idea()
        self.client.force_login(self.creator_user)
        url = reverse("api:creator-idea-detail", args=[idea.id])

        response = self.request_with_csrf(
            "patch",
            url,
            {
                "title": "Updated title",
                "creator": self.other_creator.id,
                "status": Idea.IdeaStatus.PUBLISHED,
                "published_at": timezone.now().isoformat(),
                "topics": [self.active_topic.id],
            },
        )

        self.assertEqual(response.status_code, 200)
        idea.refresh_from_db()
        self.assertEqual(idea.title, "Updated title")
        self.assertEqual(idea.creator, self.creator)
        self.assertEqual(idea.status, Idea.IdeaStatus.DRAFT)
        self.assertIsNone(idea.published_at)
        self.assertQuerySetEqual(idea.topics.all(), [self.active_topic])

    def test_another_creator_cannot_patch_owned_draft(self):
        idea = self.create_idea()
        self.client.force_login(self.other_user)

        response = self.request_with_csrf(
            "patch",
            reverse("api:creator-idea-detail", args=[idea.id]),
            {"title": "Stolen edit"},
        )

        self.assertEqual(response.status_code, 404)
        idea.refresh_from_db()
        self.assertNotEqual(idea.title, "Stolen edit")

    def test_reader_cannot_patch_creator_idea(self):
        idea = self.create_idea()
        self.client.force_login(self.reader)

        response = self.request_with_csrf(
            "patch",
            reverse("api:creator-idea-detail", args=[idea.id]),
            {"title": "Reader edit"},
        )

        self.assertEqual(response.status_code, 403)

    def test_published_and_hidden_ideas_cannot_be_patched(self):
        self.client.force_login(self.creator_user)
        for state in (Idea.IdeaStatus.PUBLISHED, Idea.IdeaStatus.HIDDEN):
            with self.subTest(state=state):
                idea = self.create_idea(status=state, title=f"{state} idea")
                response = self.request_with_csrf(
                    "patch",
                    reverse("api:creator-idea-detail", args=[idea.id]),
                    {"title": "Not allowed"},
                )
                self.assertEqual(response.status_code, 400)

    def test_owner_can_delete_own_draft(self):
        idea = self.create_idea()
        self.client.force_login(self.creator_user)

        response = self.request_with_csrf(
            "delete",
            reverse("api:creator-idea-detail", args=[idea.id]),
        )

        self.assertEqual(response.status_code, 204)
        self.assertFalse(Idea.objects.filter(pk=idea.id).exists())

    def test_another_creator_cannot_delete_owned_draft(self):
        idea = self.create_idea()
        self.client.force_login(self.other_user)

        response = self.request_with_csrf(
            "delete",
            reverse("api:creator-idea-detail", args=[idea.id]),
        )

        self.assertEqual(response.status_code, 404)
        self.assertTrue(Idea.objects.filter(pk=idea.id).exists())

    def test_published_and_hidden_ideas_cannot_be_deleted(self):
        self.client.force_login(self.creator_user)
        for state in (Idea.IdeaStatus.PUBLISHED, Idea.IdeaStatus.HIDDEN):
            with self.subTest(state=state):
                idea = self.create_idea(status=state, title=f"{state} idea")
                response = self.request_with_csrf(
                    "delete",
                    reverse("api:creator-idea-detail", args=[idea.id]),
                )
                self.assertEqual(response.status_code, 400)
                self.assertTrue(Idea.objects.filter(pk=idea.id).exists())

    def test_authenticated_workspace_write_requires_csrf(self):
        self.client.force_login(self.creator_user)

        response = self.client.post(
            self.list_url,
            data=self.valid_payload(),
            format="json",
        )

        self.assertEqual(response.status_code, 403)
        self.assertFalse(Idea.objects.filter(creator=self.creator).exists())

    def test_public_idea_api_remains_published_only_and_anonymous(self):
        published = self.create_idea(status=Idea.IdeaStatus.PUBLISHED)
        self.create_idea(status=Idea.IdeaStatus.DRAFT, title="Private draft")

        response = APIClient().get(reverse("api:idea-list"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual([item["id"] for item in response.json()], [published.id])


class FeedAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(
            email="feed-creator@example.com",
            display_name="Feed Creator",
        )
        self.creator = CreatorProfile.objects.create(user=self.user)
        self.source = Source.objects.create(
            type=Source.SourceType.ARTICLE,
            title="Feed Source",
            language="en",
        )
        self.active_topic = Topic.objects.create(
            slug="feed-active",
            name_fa="فید",
            name_en="Feed",
        )
        self.inactive_topic = Topic.objects.create(
            slug="feed-inactive",
            name_fa="غیرفعال",
            name_en="Inactive",
            is_active=False,
        )
        self.url = reverse("api:feed")

    def create_idea(self, *, status=Idea.IdeaStatus.PUBLISHED, title=None):
        idea = Idea.objects.create(
            creator=self.creator,
            source=self.source,
            language="en",
            title=title or f"Idea {Idea.objects.count() + 1}",
            body="Feed body",
            estimated_read_seconds=60,
            status=status,
        )
        return idea

    def test_feed_is_anonymous_cursor_paginated_and_published_only(self):
        published = self.create_idea(title="Published")
        draft = self.create_idea(status=Idea.IdeaStatus.DRAFT, title="Draft")
        hidden = self.create_idea(status=Idea.IdeaStatus.HIDDEN, title="Hidden")

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(set(response.json()), {"next", "previous", "results"})
        self.assertIsNone(response.json()["previous"])
        self.assertEqual(
            [item["id"] for item in response.json()["results"]],
            [published.id],
        )
        returned_ids = {item["id"] for item in response.json()["results"]}
        self.assertNotIn(draft.id, returned_ids)
        self.assertNotIn(hidden.id, returned_ids)

    def test_feed_uses_newest_first_stable_id_order(self):
        ideas = [self.create_idea(title=f"Published {index}") for index in range(3)]

        response = self.client.get(self.url)

        self.assertEqual(
            [item["id"] for item in response.json()["results"]],
            [ideas[2].id, ideas[1].id, ideas[0].id],
        )

    def test_feed_cursor_pages_do_not_overlap(self):
        ideas = [self.create_idea(title=f"Published {index}") for index in range(12)]

        first_response = self.client.get(self.url)
        self.assertEqual(first_response.status_code, 200)
        self.assertEqual(len(first_response.json()["results"]), 10)
        self.assertIsNotNone(first_response.json()["next"])

        next_url = urlsplit(first_response.json()["next"])
        second_response = self.client.get(
            f"{next_url.path}?{next_url.query}"
        )

        self.assertEqual(second_response.status_code, 200)
        self.assertEqual(len(second_response.json()["results"]), 2)

        first_ids = {item["id"] for item in first_response.json()["results"]}
        second_ids = {item["id"] for item in second_response.json()["results"]}
        self.assertTrue(first_ids.isdisjoint(second_ids))
        self.assertEqual(
            first_response.json()["results"][0]["id"],
            ideas[-1].id,
        )

    def test_feed_uses_same_safe_nested_public_representation(self):
        idea = self.create_idea()
        idea.topics.add(self.active_topic, self.inactive_topic)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 200)
        item = response.json()["results"][0]
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
        self.assertEqual(item["creator"]["display_name"], "Feed Creator")
        self.assertEqual(item["source"]["id"], self.source.id)
        self.assertEqual(
            [topic["id"] for topic in item["topics"]],
            [self.active_topic.id],
        )

    def test_feed_first_page_uses_two_queries_for_nested_results(self):
        for index in range(5):
            idea = self.create_idea(title=f"Published {index}")
            idea.topics.add(self.active_topic)

        with self.assertNumQueries(2):
            response = self.client.get(self.url)
            self.assertEqual(response.status_code, 200)
            self.assertEqual(len(response.json()["results"]), 5)

    def test_feed_rejects_writes(self):
        for method in ("post", "put", "patch", "delete"):
            with self.subTest(method=method):
                response = getattr(self.client, method)(self.url, data={})
                self.assertEqual(response.status_code, 405)
