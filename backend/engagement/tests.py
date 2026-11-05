from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from content.models import Idea, Source
from creators.models import CreatorProfile

from .models import Comment, SavedIdea, Spark


class EngagementTestCase(TestCase):
    def setUp(self):
        self.client = APIClient(enforce_csrf_checks=True)
        self.user = get_user_model().objects.create_user(
            email="reader@example.com",
            password="Reader-Password-2026!",
            display_name="Reader",
        )
        self.other_user = get_user_model().objects.create_user(
            email="other-reader@example.com",
            password="Other-Password-2026!",
            display_name="Other Reader",
        )
        creator_user = get_user_model().objects.create_user(
            email="creator@example.com",
            display_name="Creator",
        )
        self.creator = CreatorProfile.objects.create(user=creator_user)
        self.source = Source.objects.create(
            type=Source.SourceType.BOOK,
            title="Engagement Source",
            language="en",
        )
        self.published = self.create_idea(
            title="Published",
            status=Idea.IdeaStatus.PUBLISHED,
        )
        self.draft = self.create_idea(
            title="Draft",
            status=Idea.IdeaStatus.DRAFT,
        )
        self.hidden = self.create_idea(
            title="Hidden",
            status=Idea.IdeaStatus.HIDDEN,
        )
        self.csrf_url = reverse("api:accounts:csrf")

    def create_idea(self, *, title, status):
        return Idea.objects.create(
            creator=self.creator,
            source=self.source,
            language="en",
            title=title,
            body="Body",
            estimated_read_seconds=60,
            status=status,
        )

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


class EngagementModelTests(EngagementTestCase):
    def test_spark_user_idea_pair_is_unique(self):
        Spark.objects.create(user=self.user, idea=self.published)

        with self.assertRaises(IntegrityError), transaction.atomic():
            Spark.objects.create(user=self.user, idea=self.published)

    def test_saved_idea_user_idea_pair_is_unique(self):
        SavedIdea.objects.create(user=self.user, idea=self.published)

        with self.assertRaises(IntegrityError), transaction.atomic():
            SavedIdea.objects.create(user=self.user, idea=self.published)

    def test_comment_defaults_to_visible_and_tracks_timestamps(self):
        comment = Comment.objects.create(
            author=self.user,
            idea=self.published,
            body="A comment",
        )

        self.assertEqual(comment.status, Comment.CommentStatus.VISIBLE)
        self.assertIsNotNone(comment.created_at)
        self.assertIsNotNone(comment.updated_at)


class SparkAPITests(EngagementTestCase):
    def setUp(self):
        super().setUp()
        self.url = reverse("api:engagement:idea-spark", args=[self.published.id])

    def test_anonymous_cannot_spark(self):
        response = self.client.put(self.url, format="json")

        self.assertEqual(response.status_code, 403)
        self.assertFalse(Spark.objects.exists())

    def test_put_is_idempotent(self):
        self.client.force_login(self.user)

        first = self.request_with_csrf("put", self.url)
        second = self.request_with_csrf("put", self.url)

        self.assertEqual(first.status_code, 204)
        self.assertEqual(second.status_code, 204)
        self.assertEqual(
            Spark.objects.filter(user=self.user, idea=self.published).count(),
            1,
        )

    def test_delete_is_idempotent(self):
        Spark.objects.create(user=self.user, idea=self.published)
        self.client.force_login(self.user)

        first = self.request_with_csrf("delete", self.url)
        second = self.request_with_csrf("delete", self.url)

        self.assertEqual(first.status_code, 204)
        self.assertEqual(second.status_code, 204)
        self.assertFalse(
            Spark.objects.filter(user=self.user, idea=self.published).exists()
        )

    def test_spark_requires_csrf(self):
        self.client.force_login(self.user)

        response = self.client.put(self.url, format="json")

        self.assertEqual(response.status_code, 403)

    def test_draft_and_hidden_ideas_cannot_be_sparked(self):
        self.client.force_login(self.user)

        for idea in (self.draft, self.hidden):
            with self.subTest(status=idea.status):
                response = self.request_with_csrf(
                    "put",
                    reverse("api:engagement:idea-spark", args=[idea.id]),
                )
                self.assertEqual(response.status_code, 404)


class SaveAPITests(EngagementTestCase):
    def setUp(self):
        super().setUp()
        self.url = reverse("api:engagement:idea-save", args=[self.published.id])

    def test_anonymous_cannot_save(self):
        response = self.client.put(self.url, format="json")

        self.assertEqual(response.status_code, 403)
        self.assertFalse(SavedIdea.objects.exists())

    def test_put_and_delete_are_idempotent(self):
        self.client.force_login(self.user)

        first_put = self.request_with_csrf("put", self.url)
        second_put = self.request_with_csrf("put", self.url)

        self.assertEqual(first_put.status_code, 204)
        self.assertEqual(second_put.status_code, 204)
        self.assertEqual(
            SavedIdea.objects.filter(user=self.user, idea=self.published).count(),
            1,
        )

        first_delete = self.request_with_csrf("delete", self.url)
        second_delete = self.request_with_csrf("delete", self.url)

        self.assertEqual(first_delete.status_code, 204)
        self.assertEqual(second_delete.status_code, 204)
        self.assertFalse(
            SavedIdea.objects.filter(user=self.user, idea=self.published).exists()
        )

    def test_save_requires_csrf(self):
        self.client.force_login(self.user)

        response = self.client.put(self.url, format="json")

        self.assertEqual(response.status_code, 403)

    def test_draft_and_hidden_ideas_cannot_be_saved(self):
        self.client.force_login(self.user)

        for idea in (self.draft, self.hidden):
            with self.subTest(status=idea.status):
                response = self.request_with_csrf(
                    "put",
                    reverse("api:engagement:idea-save", args=[idea.id]),
                )
                self.assertEqual(response.status_code, 404)


class CommentAPITests(EngagementTestCase):
    def setUp(self):
        super().setUp()
        self.list_url = reverse(
            "api:engagement:idea-comments",
            args=[self.published.id],
        )

    def test_anonymous_can_read_visible_comments_only(self):
        visible = Comment.objects.create(
            author=self.user,
            idea=self.published,
            body="Visible",
        )
        Comment.objects.create(
            author=self.user,
            idea=self.published,
            body="Hidden",
            status=Comment.CommentStatus.HIDDEN,
        )
        Comment.objects.create(
            author=self.user,
            idea=self.published,
            body="Deleted",
            status=Comment.CommentStatus.DELETED,
        )

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual([item["id"] for item in response.json()], [visible.id])
        self.assertEqual(
            set(response.json()[0]),
            {"id", "author", "body", "created_at", "updated_at"},
        )
        self.assertEqual(
            response.json()[0]["author"],
            {"id": self.user.id, "display_name": "Reader"},
        )

    def test_comments_for_nonpublic_idea_are_not_exposed(self):
        for idea in (self.draft, self.hidden):
            with self.subTest(status=idea.status):
                response = self.client.get(
                    reverse("api:engagement:idea-comments", args=[idea.id])
                )
                self.assertEqual(response.status_code, 404)

    def test_authenticated_user_can_create_comment(self):
        self.client.force_login(self.user)

        response = self.request_with_csrf(
            "post",
            self.list_url,
            {"body": "  Useful thought  "},
        )

        self.assertEqual(response.status_code, 201)
        comment = Comment.objects.get(pk=response.json()["id"])
        self.assertEqual(comment.author, self.user)
        self.assertEqual(comment.idea, self.published)
        self.assertEqual(comment.body, "Useful thought")
        self.assertEqual(comment.status, Comment.CommentStatus.VISIBLE)

    def test_comment_author_and_status_cannot_be_spoofed(self):
        self.client.force_login(self.user)

        response = self.request_with_csrf(
            "post",
            self.list_url,
            {
                "body": "Mine",
                "author": {"id": self.other_user.id, "display_name": "Other"},
                "status": Comment.CommentStatus.HIDDEN,
            },
        )

        self.assertEqual(response.status_code, 201)
        comment = Comment.objects.get(pk=response.json()["id"])
        self.assertEqual(comment.author, self.user)
        self.assertEqual(comment.status, Comment.CommentStatus.VISIBLE)

    def test_blank_comment_is_rejected(self):
        self.client.force_login(self.user)

        response = self.request_with_csrf(
            "post",
            self.list_url,
            {"body": "   "},
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("body", response.json())

    def test_comment_over_4000_characters_is_rejected(self):
        self.client.force_login(self.user)

        response = self.request_with_csrf(
            "post",
            self.list_url,
            {"body": "x" * 4001},
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("body", response.json())

    def test_comment_creation_requires_authentication_and_csrf(self):
        anonymous_response = self.client.post(
            self.list_url,
            data={"body": "Anonymous"},
            format="json",
        )
        self.assertEqual(anonymous_response.status_code, 403)

        self.client.force_login(self.user)
        csrf_response = self.client.post(
            self.list_url,
            data={"body": "No token"},
            format="json",
        )
        self.assertEqual(csrf_response.status_code, 403)

    def test_cannot_comment_on_draft_or_hidden_idea(self):
        self.client.force_login(self.user)

        for idea in (self.draft, self.hidden):
            with self.subTest(status=idea.status):
                response = self.request_with_csrf(
                    "post",
                    reverse("api:engagement:idea-comments", args=[idea.id]),
                    {"body": "Not public"},
                )
                self.assertEqual(response.status_code, 404)

    def test_owner_delete_soft_deletes_and_hides_comment(self):
        comment = Comment.objects.create(
            author=self.user,
            idea=self.published,
            body="Delete me",
        )
        self.client.force_login(self.user)
        detail_url = reverse(
            "api:engagement:comment-detail",
            args=[comment.id],
        )

        response = self.request_with_csrf("delete", detail_url)

        self.assertEqual(response.status_code, 204)
        comment.refresh_from_db()
        self.assertEqual(comment.status, Comment.CommentStatus.DELETED)
        self.assertEqual(self.client.get(self.list_url).json(), [])

    def test_comment_delete_is_idempotent_for_owner(self):
        comment = Comment.objects.create(
            author=self.user,
            idea=self.published,
            body="Delete twice",
        )
        self.client.force_login(self.user)
        detail_url = reverse(
            "api:engagement:comment-detail",
            args=[comment.id],
        )

        first = self.request_with_csrf("delete", detail_url)
        second = self.request_with_csrf("delete", detail_url)

        self.assertEqual(first.status_code, 204)
        self.assertEqual(second.status_code, 204)

    def test_other_user_cannot_delete_comment(self):
        comment = Comment.objects.create(
            author=self.user,
            idea=self.published,
            body="Owned",
        )
        self.client.force_login(self.other_user)

        response = self.request_with_csrf(
            "delete",
            reverse("api:engagement:comment-detail", args=[comment.id]),
        )

        self.assertEqual(response.status_code, 403)
        comment.refresh_from_db()
        self.assertEqual(comment.status, Comment.CommentStatus.VISIBLE)

    def test_comment_delete_requires_csrf(self):
        comment = Comment.objects.create(
            author=self.user,
            idea=self.published,
            body="Protected",
        )
        self.client.force_login(self.user)

        response = self.client.delete(
            reverse("api:engagement:comment-detail", args=[comment.id])
        )

        self.assertEqual(response.status_code, 403)
        comment.refresh_from_db()
        self.assertEqual(comment.status, Comment.CommentStatus.VISIBLE)
