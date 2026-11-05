from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from content.models import Idea, Source, Topic
from creators.models import CreatorProfile
from engagement.models import SavedIdea


class SavedLibraryAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(
            email="library-reader@example.com",
            display_name="Library Reader",
        )
        self.other_user = get_user_model().objects.create_user(
            email="other-library-reader@example.com"
        )
        creator_user = get_user_model().objects.create_user(
            email="library-creator@example.com",
            display_name="Library Creator",
        )
        self.creator = CreatorProfile.objects.create(user=creator_user)
        self.source = Source.objects.create(
            type=Source.SourceType.BOOK,
            title="Library Source",
            language="en",
        )
        self.active_topic = Topic.objects.create(
            slug="library-active",
            name_fa="کتابخانه",
            name_en="Library",
        )
        self.inactive_topic = Topic.objects.create(
            slug="library-inactive",
            name_fa="غیرفعال",
            name_en="Inactive",
            is_active=False,
        )
        self.published = self.create_idea(
            title="Saved Published",
            status=Idea.IdeaStatus.PUBLISHED,
        )
        self.second_published = self.create_idea(
            title="Second Saved Published",
            status=Idea.IdeaStatus.PUBLISHED,
        )
        self.draft = self.create_idea(
            title="Saved Draft",
            status=Idea.IdeaStatus.DRAFT,
        )
        self.hidden = self.create_idea(
            title="Saved Hidden",
            status=Idea.IdeaStatus.HIDDEN,
        )
        self.url = reverse("api:library:saved")

    def create_idea(self, *, title, status):
        return Idea.objects.create(
            creator=self.creator,
            source=self.source,
            language="en",
            title=title,
            body="Library body",
            estimated_read_seconds=60,
            status=status,
        )

    def test_library_requires_authentication(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 403)

    def test_library_returns_only_current_users_published_saved_ideas(self):
        first = SavedIdea.objects.create(user=self.user, idea=self.published)
        second = SavedIdea.objects.create(user=self.user, idea=self.second_published)
        SavedIdea.objects.create(user=self.user, idea=self.draft)
        SavedIdea.objects.create(user=self.user, idea=self.hidden)
        SavedIdea.objects.create(user=self.other_user, idea=self.published)

        self.client.force_login(self.user)
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 2)
        self.assertEqual(
            [item["idea"]["id"] for item in response.json()],
            [second.idea_id, first.idea_id],
        )
        self.assertEqual(
            set(response.json()[0]),
            {"saved_at", "idea"},
        )

    def test_library_uses_safe_public_idea_representation_and_active_topics(self):
        self.published.topics.add(self.active_topic, self.inactive_topic)
        SavedIdea.objects.create(user=self.user, idea=self.published)
        self.client.force_login(self.user)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 200)
        idea = response.json()[0]["idea"]
        self.assertEqual(
            set(idea),
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
        self.assertEqual(
            [topic["id"] for topic in idea["topics"]],
            [self.active_topic.id],
        )

    def test_library_nested_serialization_uses_two_queries(self):
        for idea in (self.published, self.second_published):
            idea.topics.add(self.active_topic)
            SavedIdea.objects.create(user=self.user, idea=idea)
        self.client.force_authenticate(user=self.user)

        with self.assertNumQueries(2):
            response = self.client.get(self.url)
            self.assertEqual(response.status_code, 200)
            self.assertEqual(len(response.json()), 2)

    def test_idea_hidden_after_save_disappears_from_library(self):
        SavedIdea.objects.create(user=self.user, idea=self.published)
        self.published.status = Idea.IdeaStatus.HIDDEN
        self.published.save(update_fields=["status"])
        self.client.force_login(self.user)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [])
