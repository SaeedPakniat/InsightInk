from django.contrib.auth.models import Group
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from accounts.models import User
from accounts.permissions import MODERATOR_GROUP_NAME
from content.models import Idea, Source
from creators.models import CreatorProfile
from engagement.models import Comment

from .models import ModerationAction, Report


class ModerationTestCase(TestCase):
    def setUp(self):
        self.client = APIClient(enforce_csrf_checks=True)
        self.reporter = User.objects.create_user(
            email="reporter@example.com",
            display_name="Reporter",
        )
        self.comment_author = User.objects.create_user(
            email="comment-author@example.com",
            display_name="Comment Author",
        )
        self.ordinary = User.objects.create_user(
            email="ordinary@example.com",
            display_name="Ordinary",
        )
        self.staff_only = User.objects.create_user(
            email="staff-only@example.com",
            display_name="Staff Only",
            is_staff=True,
        )
        self.moderator = User.objects.create_user(
            email="moderator@example.com",
            display_name="Moderator",
            is_staff=True,
        )
        moderator_group = Group.objects.get(name=MODERATOR_GROUP_NAME)
        self.moderator.groups.add(moderator_group)

        self.admin = User.objects.create_superuser(
            email="admin@example.com",
            password="Admin-Password-2026!",
            display_name="Admin",
        )

        creator_user = User.objects.create_user(
            email="moderation-creator@example.com",
            display_name="Creator",
        )
        self.creator = CreatorProfile.objects.create(user=creator_user)
        self.source = Source.objects.create(
            type=Source.SourceType.ARTICLE,
            title="Moderation Source",
            language="en",
        )
        self.published = self.create_idea(
            "Published",
            Idea.IdeaStatus.PUBLISHED,
        )
        self.draft = self.create_idea("Draft", Idea.IdeaStatus.DRAFT)
        self.visible_comment = Comment.objects.create(
            author=self.comment_author,
            idea=self.published,
            body="Visible reported comment",
        )
        self.hidden_comment = Comment.objects.create(
            author=self.comment_author,
            idea=self.published,
            body="Hidden comment",
            status=Comment.CommentStatus.HIDDEN,
        )
        self.deleted_comment = Comment.objects.create(
            author=self.comment_author,
            idea=self.published,
            body="Deleted comment",
            status=Comment.CommentStatus.DELETED,
        )
        self.draft_comment = Comment.objects.create(
            author=self.comment_author,
            idea=self.draft,
            body="Draft comment",
        )
        self.csrf_url = reverse("api:accounts:csrf")

    def create_idea(self, title, status):
        return Idea.objects.create(
            creator=self.creator,
            source=self.source,
            language="en",
            title=title,
            body="Moderation body",
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

    def create_report(
        self,
        *,
        reporter=None,
        comment=None,
        status=Report.Status.OPEN,
        reason=Report.Reason.SPAM,
    ):
        return Report.objects.create(
            reporter=reporter or self.reporter,
            target_type=Report.TargetType.COMMENT,
            target_id=(comment or self.visible_comment).id,
            reason=reason,
            status=status,
        )


class CommentReportAPITests(ModerationTestCase):
    def setUp(self):
        super().setUp()
        self.url = reverse(
            "api:moderation:comment-report",
            args=[self.visible_comment.id],
        )

    def test_anonymous_cannot_report_comment(self):
        response = self.client.post(
            self.url,
            data={"reason": "spam"},
            format="json",
        )

        self.assertEqual(response.status_code, 403)
        self.assertFalse(Report.objects.exists())

    def test_authenticated_user_can_report_visible_comment(self):
        self.client.force_login(self.reporter)

        response = self.request_with_csrf(
            "post",
            self.url,
            {
                "reason": Report.Reason.HARASSMENT,
                "details": "Repeated personal attacks.",
            },
        )

        self.assertEqual(response.status_code, 201)
        report = Report.objects.get(pk=response.json()["id"])
        self.assertEqual(report.reporter, self.reporter)
        self.assertEqual(report.target_type, Report.TargetType.COMMENT)
        self.assertEqual(report.target_id, self.visible_comment.id)
        self.assertEqual(report.status, Report.Status.OPEN)
        self.assertEqual(report.reason, Report.Reason.HARASSMENT)
        self.assertIsNone(report.resolved_at)

    def test_comment_report_requires_csrf(self):
        self.client.force_login(self.reporter)

        response = self.client.post(
            self.url,
            data={"reason": "spam"},
            format="json",
        )

        self.assertEqual(response.status_code, 403)
        self.assertFalse(Report.objects.exists())

    def test_report_reason_is_bounded_to_locked_categories(self):
        self.client.force_login(self.reporter)

        response = self.request_with_csrf(
            "post",
            self.url,
            {"reason": "misinformation"},
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("reason", response.json())

    def test_report_details_are_length_bounded(self):
        self.client.force_login(self.reporter)

        response = self.request_with_csrf(
            "post",
            self.url,
            {
                "reason": "other",
                "details": "x" * 2001,
            },
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("details", response.json())

    def test_nonpublic_comments_cannot_be_reported(self):
        self.client.force_login(self.reporter)

        for comment in (
            self.hidden_comment,
            self.deleted_comment,
            self.draft_comment,
        ):
            with self.subTest(comment=comment.id):
                response = self.request_with_csrf(
                    "post",
                    reverse(
                        "api:moderation:comment-report",
                        args=[comment.id],
                    ),
                    {"reason": "spam"},
                )
                self.assertEqual(response.status_code, 404)


class ModeratorQueueAPITests(ModerationTestCase):
    def setUp(self):
        super().setUp()
        self.open_report = self.create_report()
        self.reviewing_report = self.create_report(
            comment=self.hidden_comment,
            status=Report.Status.REVIEWING,
        )
        self.list_url = reverse("api:moderation:report-list")
        self.detail_url = reverse(
            "api:moderation:report-detail",
            args=[self.open_report.id],
        )

    def test_ordinary_and_staff_only_users_cannot_view_queue(self):
        for user in (self.ordinary, self.staff_only):
            with self.subTest(user=user.email):
                self.client.force_login(user)
                response = self.client.get(self.list_url)
                self.assertEqual(response.status_code, 403)
                self.client.logout()

    def test_moderator_can_view_cursor_paginated_report_queue(self):
        self.client.force_login(self.moderator)

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(set(response.json()), {"next", "previous", "results"})
        ids = [item["id"] for item in response.json()["results"]]
        self.assertEqual(ids, [self.reviewing_report.id, self.open_report.id])
        first = response.json()["results"][0]
        self.assertEqual(
            first["reporter"],
            {
                "id": self.reporter.id,
                "display_name": "Reporter",
            },
        )
        self.assertNotIn("email", first["reporter"])

    def test_admin_can_view_queue_without_moderator_group(self):
        self.client.force_login(self.admin)

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, 200)

    def test_queue_can_filter_by_valid_status(self):
        self.client.force_login(self.moderator)

        response = self.client.get(
            self.list_url,
            {"status": Report.Status.OPEN},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [item["id"] for item in response.json()["results"]],
            [self.open_report.id],
        )

    def test_invalid_status_filter_returns_400(self):
        self.client.force_login(self.moderator)

        response = self.client.get(self.list_url, {"status": "closed"})

        self.assertEqual(response.status_code, 400)
        self.assertIn("status", response.json())

    def test_report_detail_exposes_target_comment_and_audit_only_to_moderator(self):
        ModerationAction.objects.create(
            moderator=self.moderator,
            report=self.open_report,
            action_type=ModerationAction.ActionType.REVIEW_STARTED,
            target_type=Report.TargetType.COMMENT,
            target_id=self.visible_comment.id,
            note="Initial audit note.",
        )

        self.client.force_login(self.moderator)
        response = self.client.get(self.detail_url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json()["target_comment"]["body"],
            "Visible reported comment",
        )
        self.assertEqual(
            response.json()["target_comment"]["author"],
            {
                "id": self.comment_author.id,
                "display_name": "Comment Author",
            },
        )
        self.assertEqual(len(response.json()["actions"]), 1)
        self.assertEqual(
            response.json()["actions"][0]["moderator"],
            {
                "id": self.moderator.id,
                "display_name": "Moderator",
            },
        )

        self.client.force_login(self.ordinary)
        denied = self.client.get(self.detail_url)
        self.assertEqual(denied.status_code, 403)


class ModerationWorkflowAPITests(ModerationTestCase):
    def setUp(self):
        super().setUp()
        self.report = self.create_report()
        self.start_url = reverse(
            "api:moderation:report-start-review",
            args=[self.report.id],
        )
        self.hide_url = reverse(
            "api:moderation:report-hide-comment",
            args=[self.report.id],
        )
        self.resolve_url = reverse(
            "api:moderation:report-resolve",
            args=[self.report.id],
        )
        self.reject_url = reverse(
            "api:moderation:report-reject",
            args=[self.report.id],
        )

    def test_moderator_action_requires_csrf(self):
        self.client.force_login(self.moderator)

        response = self.client.post(self.start_url, data={}, format="json")

        self.assertEqual(response.status_code, 403)
        self.report.refresh_from_db()
        self.assertEqual(self.report.status, Report.Status.OPEN)

    def test_ordinary_user_cannot_start_review(self):
        self.client.force_login(self.ordinary)

        response = self.request_with_csrf("post", self.start_url)

        self.assertEqual(response.status_code, 403)
        self.report.refresh_from_db()
        self.assertEqual(self.report.status, Report.Status.OPEN)

    def test_open_report_moves_to_reviewing_and_records_audit(self):
        self.client.force_login(self.moderator)

        response = self.request_with_csrf(
            "post",
            self.start_url,
            {"note": "Taking this case."},
        )

        self.assertEqual(response.status_code, 200)
        self.report.refresh_from_db()
        self.assertEqual(self.report.status, Report.Status.REVIEWING)
        action = ModerationAction.objects.get(report=self.report)
        self.assertEqual(
            action.action_type,
            ModerationAction.ActionType.REVIEW_STARTED,
        )
        self.assertEqual(action.moderator, self.moderator)
        self.assertEqual(action.note, "Taking this case.")

    def test_report_cannot_skip_reviewing_state(self):
        self.client.force_login(self.moderator)

        resolved = self.request_with_csrf("post", self.resolve_url)
        rejected = self.request_with_csrf("post", self.reject_url)

        self.assertEqual(resolved.status_code, 400)
        self.assertEqual(rejected.status_code, 400)
        self.report.refresh_from_db()
        self.assertEqual(self.report.status, Report.Status.OPEN)
        self.assertFalse(ModerationAction.objects.exists())

    def test_reviewing_report_can_hide_comment_and_audit_action(self):
        self.client.force_login(self.moderator)
        self.request_with_csrf("post", self.start_url)

        response = self.request_with_csrf(
            "post",
            self.hide_url,
            {"note": "Comment violates discussion rules."},
        )

        self.assertEqual(response.status_code, 204)
        self.visible_comment.refresh_from_db()
        self.assertEqual(
            self.visible_comment.status,
            Comment.CommentStatus.HIDDEN,
        )
        action = ModerationAction.objects.get(
            report=self.report,
            action_type=ModerationAction.ActionType.COMMENT_HIDDEN,
        )
        self.assertEqual(action.target_id, self.visible_comment.id)

        public_comments = APIClient().get(
            reverse(
                "api:engagement:idea-comments",
                args=[self.published.id],
            )
        )
        returned_ids = {item["id"] for item in public_comments.json()}
        self.assertNotIn(self.visible_comment.id, returned_ids)

    def test_comment_cannot_be_hidden_before_review(self):
        self.client.force_login(self.moderator)

        response = self.request_with_csrf("post", self.hide_url)

        self.assertEqual(response.status_code, 400)
        self.visible_comment.refresh_from_db()
        self.assertEqual(
            self.visible_comment.status,
            Comment.CommentStatus.VISIBLE,
        )

    def test_duplicate_hide_action_is_rejected_without_duplicate_audit(self):
        self.client.force_login(self.moderator)
        self.request_with_csrf("post", self.start_url)
        first = self.request_with_csrf("post", self.hide_url)
        second = self.request_with_csrf("post", self.hide_url)

        self.assertEqual(first.status_code, 204)
        self.assertEqual(second.status_code, 400)
        self.assertEqual(
            ModerationAction.objects.filter(
                report=self.report,
                action_type=ModerationAction.ActionType.COMMENT_HIDDEN,
            ).count(),
            1,
        )

    def test_reviewing_report_can_resolve_and_sets_timestamp(self):
        self.client.force_login(self.moderator)
        self.request_with_csrf("post", self.start_url)

        response = self.request_with_csrf(
            "post",
            self.resolve_url,
            {"note": "Handled."},
        )

        self.assertEqual(response.status_code, 200)
        self.report.refresh_from_db()
        self.assertEqual(self.report.status, Report.Status.RESOLVED)
        self.assertIsNotNone(self.report.resolved_at)
        self.assertTrue(
            ModerationAction.objects.filter(
                report=self.report,
                action_type=ModerationAction.ActionType.REPORT_RESOLVED,
                moderator=self.moderator,
            ).exists()
        )

    def test_reviewing_report_can_be_rejected(self):
        self.client.force_login(self.moderator)
        self.request_with_csrf("post", self.start_url)

        response = self.request_with_csrf(
            "post",
            self.reject_url,
            {"note": "No violation found."},
        )

        self.assertEqual(response.status_code, 200)
        self.report.refresh_from_db()
        self.assertEqual(self.report.status, Report.Status.REJECTED)
        self.assertIsNotNone(self.report.resolved_at)
        self.assertTrue(
            ModerationAction.objects.filter(
                report=self.report,
                action_type=ModerationAction.ActionType.REPORT_REJECTED,
            ).exists()
        )

    def test_terminal_report_cannot_transition_again(self):
        self.client.force_login(self.moderator)
        self.request_with_csrf("post", self.start_url)
        self.request_with_csrf("post", self.resolve_url)

        again = self.request_with_csrf("post", self.reject_url)
        restart = self.request_with_csrf("post", self.start_url)

        self.assertEqual(again.status_code, 400)
        self.assertEqual(restart.status_code, 400)

    def test_admin_can_perform_moderation_action_without_group(self):
        self.client.force_login(self.admin)

        response = self.request_with_csrf("post", self.start_url)

        self.assertEqual(response.status_code, 200)
        action = ModerationAction.objects.get(report=self.report)
        self.assertEqual(action.moderator, self.admin)

    def test_moderation_note_is_length_bounded(self):
        self.client.force_login(self.moderator)

        response = self.request_with_csrf(
            "post",
            self.start_url,
            {"note": "x" * 2001},
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("note", response.json())
        self.report.refresh_from_db()
        self.assertEqual(self.report.status, Report.Status.OPEN)
