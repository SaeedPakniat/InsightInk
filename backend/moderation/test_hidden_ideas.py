from datetime import timedelta
from urllib.parse import urlsplit

from django.utils import timezone
from django.urls import reverse

from content.models import Idea

from .models import ModerationAction, Report
from .tests import ModerationTestCase


class HiddenIdeaWorkspaceAPITests(ModerationTestCase):
    def setUp(self):
        super().setUp()
        self.url = reverse("api:moderation:hidden-idea-list")

    def create_workspace_idea(self, title, status=Idea.IdeaStatus.HIDDEN, body=None):
        idea = self.create_idea(title, status)
        if body is not None:
            idea.body = body
            idea.save(update_fields=["body", "updated_at"])
        return idea

    def get_workspace(self, client=None):
        return (client or self.client).get(self.url, {"status": "hidden"})

    def test_permission_matrix_uses_locked_moderator_authority(self):
        actors = (
            (None, 403),
            (self.ordinary, 403),
            (self.creator.user, 403),
            (self.staff_only, 403),
            (self.moderator, 200),
            (self.admin, 200),
        )

        for actor, expected_status in actors:
            with self.subTest(actor=getattr(actor, "email", "anonymous")):
                self.client.logout()
                if actor is not None:
                    self.client.force_login(actor)
                response = self.get_workspace()
                self.assertEqual(response.status_code, expected_status)

    def test_status_is_required_and_only_hidden_is_supported(self):
        self.client.force_login(self.moderator)

        missing = self.client.get(self.url)
        self.assertEqual(missing.status_code, 400)
        self.assertIn("status", missing.json())

        for unsupported in ("published", "draft", "withdrawn", "nonsense"):
            with self.subTest(status=unsupported):
                response = self.client.get(self.url, {"status": unsupported})
                self.assertEqual(response.status_code, 400)
                self.assertIn("status", response.json())

        self.assertEqual(self.get_workspace().status_code, 200)

    def test_only_hidden_ideas_are_returned_with_exact_safe_shape(self):
        published = self.published
        draft = self.draft
        hidden = self.create_workspace_idea(
            "Hidden workspace result",
            body="Short moderation preview.",
        )
        withdrawn = self.create_workspace_idea(
            "Withdrawn workspace exclusion",
            status=Idea.IdeaStatus.WITHDRAWN,
        )
        self.client.force_login(self.moderator)

        response = self.get_workspace()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(set(response.json()), {"next", "previous", "results"})
        results = response.json()["results"]
        returned_ids = {item["id"] for item in results}
        self.assertIn(hidden.id, returned_ids)
        self.assertNotIn(published.id, returned_ids)
        self.assertNotIn(draft.id, returned_ids)
        self.assertNotIn(withdrawn.id, returned_ids)

        item = next(result for result in results if result["id"] == hidden.id)
        self.assertEqual(
            set(item),
            {
                "id",
                "title",
                "body_excerpt",
                "language",
                "status",
                "creator",
                "source",
                "published_at",
                "updated_at",
            },
        )
        self.assertEqual(
            item["creator"],
            {"id": self.creator.id, "display_name": "Creator"},
        )
        self.assertEqual(
            item["source"],
            {
                "id": self.source.id,
                "type": self.source.type,
                "title": self.source.title,
            },
        )
        self.assertEqual(item["body_excerpt"], hidden.body)
        self.assertEqual(item["status"], Idea.IdeaStatus.HIDDEN)
        for forbidden_field in (
            "body",
            "email",
            "created_by",
            "metadata",
            "note",
            "hidden_by",
            "hidden_at",
        ):
            self.assertNotIn(forbidden_field, item)

    def test_long_unicode_body_uses_exact_240_character_excerpt_rule(self):
        body = "ایدهٔ فارسی " * 30
        self.assertGreater(len(body), 240)
        hidden = self.create_workspace_idea("Persian excerpt", body=body)
        self.client.force_login(self.moderator)

        response = self.get_workspace()

        item = next(
            result
            for result in response.json()["results"]
            if result["id"] == hidden.id
        )
        self.assertEqual(item["body_excerpt"], body[:239] + "…")
        self.assertEqual(len(item["body_excerpt"]), 240)

    def test_ordering_is_newest_updated_at_then_highest_id(self):
        older = self.create_workspace_idea("Older")
        tied_low_id = self.create_workspace_idea("Tie low")
        tied_high_id = self.create_workspace_idea("Tie high")
        newest = self.create_workspace_idea("Newest")
        now = timezone.now()
        Idea.objects.filter(pk=older.pk).update(updated_at=now - timedelta(hours=2))
        Idea.objects.filter(pk__in=(tied_low_id.pk, tied_high_id.pk)).update(
            updated_at=now - timedelta(hours=1)
        )
        Idea.objects.filter(pk=newest.pk).update(updated_at=now)
        self.client.force_login(self.moderator)

        response = self.get_workspace()

        self.assertEqual(
            [item["id"] for item in response.json()["results"]],
            [newest.id, tied_high_id.id, tied_low_id.id, older.id],
        )

    def test_cursor_pagination_returns_every_hidden_idea_once(self):
        hidden = [self.create_workspace_idea(f"Hidden {index}") for index in range(30)]
        self.create_workspace_idea("Excluded published", Idea.IdeaStatus.PUBLISHED)
        self.client.force_login(self.moderator)

        first = self.get_workspace()
        self.assertEqual(first.status_code, 200)
        self.assertEqual(len(first.json()["results"]), 25)
        self.assertIsNotNone(first.json()["next"])
        self.assertIn("status=hidden", first.json()["next"])

        next_url = urlsplit(first.json()["next"])
        second = self.client.get(f"{next_url.path}?{next_url.query}")
        self.assertEqual(second.status_code, 200)
        self.assertEqual(len(second.json()["results"]), 5)

        returned_ids = [
            item["id"]
            for response in (first, second)
            for item in response.json()["results"]
        ]
        expected_ids = [idea.id for idea in reversed(hidden)]
        self.assertEqual(returned_ids, expected_ids)
        self.assertEqual(len(returned_ids), len(set(returned_ids)))
        self.assertTrue(
            all(
                item["status"] == Idea.IdeaStatus.HIDDEN
                for response in (first, second)
                for item in response.json()["results"]
            )
        )

    def test_creator_and_source_are_loaded_without_n_plus_one_queries(self):
        for index in range(5):
            self.create_workspace_idea(f"Query bounded {index}")
        self.client.force_authenticate(user=self.moderator)

        with self.assertNumQueries(2):
            response = self.get_workspace()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()["results"]), 5)

    def test_restore_removes_idea_from_workspace_and_preserves_audit(self):
        hidden = self.create_workspace_idea("Restore from workspace")
        self.client.force_login(self.moderator)
        before = self.get_workspace()
        self.assertIn(hidden.id, [item["id"] for item in before.json()["results"]])

        restored = self.request_with_csrf(
            "post",
            reverse("api:moderation:idea-restore", args=[hidden.id]),
            {"note": "Workspace review complete."},
        )

        self.assertEqual(restored.status_code, 200)
        self.assertEqual(restored.json()["status"], Idea.IdeaStatus.PUBLISHED)
        self.assertEqual(
            restored.json()["action"],
            ModerationAction.ActionType.IDEA_RESTORED,
        )
        self.assertTrue(
            ModerationAction.objects.filter(
                moderator=self.moderator,
                report__isnull=True,
                action_type=ModerationAction.ActionType.IDEA_RESTORED,
                target_type=Report.TargetType.IDEA,
                target_id=hidden.id,
                note="Workspace review complete.",
            ).exists()
        )
        after = self.get_workspace()
        self.assertNotIn(hidden.id, [item["id"] for item in after.json()["results"]])
