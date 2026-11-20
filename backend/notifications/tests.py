from unittest.mock import patch
from urllib.parse import urlsplit

from django.contrib.auth.models import Group
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from accounts.models import User
from accounts.permissions import MODERATOR_GROUP_NAME
from content.models import Idea, Source
from creators.models import CreatorProfile
from messaging.models import Conversation, Message
from messaging.services import send_message

from .models import Notification


class NotificationAPITests(TestCase):
    def setUp(self):
        self.client = APIClient(enforce_csrf_checks=True)
        self.recipient = User.objects.create_user(
            email="notif-recipient@example.com",
            display_name="Recipient",
        )
        self.other = User.objects.create_user(
            email="notif-other@example.com",
            display_name="Other User",
        )
        self.reader = User.objects.create_user(
            email="notif-reader@example.com",
            display_name="Reader",
        )
        creator_user = User.objects.create_user(
            email="notif-creator@example.com",
            display_name="Creator",
        )
        self.creator = CreatorProfile.objects.create(user=creator_user)
        self.moderator = User.objects.create_user(
            email="notif-moderator@example.com",
            display_name="Moderator",
            is_staff=True,
        )
        Group.objects.get(name=MODERATOR_GROUP_NAME).user_set.add(
            self.moderator
        )

        self.source = Source.objects.create(
            type=Source.SourceType.BOOK,
            title="Notification Source",
            language="en",
        )
        self.idea = Idea.objects.create(
            creator=self.creator,
            source=self.source,
            language="en",
            title="Notification Idea",
            body="Body",
            estimated_read_seconds=60,
            status=Idea.IdeaStatus.PUBLISHED,
        )
        self.conversation = Conversation.objects.create(
            reader=self.reader,
            creator=self.creator,
        )

        self.csrf_url = reverse("api:accounts:csrf")
        self.list_url = reverse(
            "api:notifications:notification-list"
        )
        self.unread_url = reverse(
            "api:notifications:notification-unread-count"
        )
        self.read_all_url = reverse(
            "api:notifications:notification-read-all"
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

    def read_url(self, notification):
        return reverse(
            "api:notifications:notification-read",
            args=[notification.id],
        )

    def create_notification(
        self,
        *,
        recipient=None,
        notification_type=Notification.Type.CREATOR_FOLLOWED,
        actor=None,
    ):
        return Notification.objects.create(
            recipient=recipient or self.recipient,
            type=notification_type,
            actor=actor or self.other,
            creator=self.creator,
        )

    def test_list_requires_auth_and_returns_only_recipient_rows(self):
        own = self.create_notification()
        self.create_notification(recipient=self.other)

        anonymous = self.client.get(self.list_url)
        self.assertEqual(anonymous.status_code, 403)

        self.client.force_login(self.recipient)
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [item["id"] for item in response.json()["results"]],
            [own.id],
        )
        item = response.json()["results"][0]
        self.assertEqual(
            set(item),
            {
                "id",
                "type",
                "actor",
                "target",
                "created_at",
                "read_at",
                "is_read",
            },
        )
        self.assertEqual(
            item["actor"],
            {
                "id": self.other.id,
                "display_name": self.other.display_name,
            },
        )
        self.assertNotIn("email", item["actor"])
        self.assertEqual(
            item["target"],
            {"creator_id": self.creator.id},
        )
        self.assertFalse(item["is_read"])

    def test_list_is_cursor_paginated_without_duplicates(self):
        notifications = [
            self.create_notification()
            for _ in range(35)
        ]
        self.client.force_login(self.recipient)

        first = self.client.get(self.list_url)
        self.assertEqual(first.status_code, 200)
        self.assertEqual(len(first.json()["results"]), 30)
        self.assertIsNotNone(first.json()["next"])

        next_url = urlsplit(first.json()["next"])
        second = self.client.get(
            f"{next_url.path}?{next_url.query}"
        )
        self.assertEqual(second.status_code, 200)
        self.assertEqual(len(second.json()["results"]), 5)

        returned_ids = [
            item["id"]
            for response in (first, second)
            for item in response.json()["results"]
        ]
        expected_ids = [
            notification.id
            for notification in reversed(notifications)
        ]
        self.assertEqual(returned_ids, expected_ids)
        self.assertEqual(len(returned_ids), len(set(returned_ids)))

    def test_unread_count_is_recipient_scoped(self):
        unread = self.create_notification()
        read = self.create_notification()
        read.read_at = unread.created_at
        read.save(update_fields=("read_at",))
        self.create_notification(recipient=self.other)
        self.client.force_login(self.recipient)

        response = self.client.get(self.unread_url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"unread_count": 1})

    def test_mark_one_read_is_idempotent_and_private(self):
        notification = self.create_notification()

        self.client.force_login(self.other)
        outsider = self.request_with_csrf(
            "post",
            self.read_url(notification),
        )
        self.assertEqual(outsider.status_code, 404)

        self.client.force_login(self.recipient)
        first = self.request_with_csrf(
            "post",
            self.read_url(notification),
        )
        self.assertEqual(first.status_code, 200)
        self.assertTrue(first.json()["is_read"])
        first_read_at = first.json()["read_at"]

        second = self.request_with_csrf(
            "post",
            self.read_url(notification),
        )
        self.assertEqual(second.status_code, 200)
        self.assertEqual(second.json()["read_at"], first_read_at)

    def test_mark_all_read_only_updates_current_recipient(self):
        own = [self.create_notification() for _ in range(3)]
        foreign = self.create_notification(recipient=self.other)
        self.client.force_login(self.recipient)

        first = self.request_with_csrf("post", self.read_all_url)
        self.assertEqual(first.status_code, 200)
        self.assertEqual(first.json()["marked_read"], 3)

        self.assertFalse(
            Notification.objects.filter(
                id__in=[item.id for item in own],
                read_at__isnull=True,
            ).exists()
        )
        foreign.refresh_from_db()
        self.assertIsNone(foreign.read_at)

        second = self.request_with_csrf("post", self.read_all_url)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(second.json()["marked_read"], 0)

    def test_read_mutations_require_authentication_and_csrf(self):
        notification = self.create_notification()

        anonymous_one = self.client.post(
            self.read_url(notification),
            {},
            format="json",
        )
        anonymous_all = self.client.post(
            self.read_all_url,
            {},
            format="json",
        )
        self.assertEqual(anonymous_one.status_code, 403)
        self.assertEqual(anonymous_all.status_code, 403)

        self.client.force_login(self.recipient)
        no_csrf_one = self.client.post(
            self.read_url(notification),
            {},
            format="json",
        )
        no_csrf_all = self.client.post(
            self.read_all_url,
            {},
            format="json",
        )
        self.assertEqual(no_csrf_one.status_code, 403)
        self.assertEqual(no_csrf_all.status_code, 403)

    def test_message_send_creates_recipient_only_notification(self):
        self.client.force_login(self.reader)
        response = self.request_with_csrf(
            "post",
            reverse(
                "api:messaging:conversation-messages",
                args=[self.conversation.id],
            ),
            {"body": "Notify the creator."},
        )
        self.assertEqual(response.status_code, 201)

        notification = Notification.objects.get(
            type=Notification.Type.MESSAGE_RECEIVED,
            message_id=response.json()["id"],
        )
        self.assertEqual(notification.recipient, self.creator.user)
        self.assertEqual(notification.actor, self.reader)
        self.assertFalse(
            Notification.objects.filter(
                recipient=self.reader,
                type=Notification.Type.MESSAGE_RECEIVED,
                message_id=response.json()["id"],
            ).exists()
        )

    def test_follow_creates_one_notification_only_on_first_follow(self):
        self.client.force_login(self.other)
        url = reverse(
            "api:creators:creator-follow",
            args=[self.creator.id],
        )

        first = self.request_with_csrf("put", url)
        second = self.request_with_csrf("put", url)

        self.assertEqual(first.status_code, 204)
        self.assertEqual(second.status_code, 204)
        notifications = Notification.objects.filter(
            recipient=self.creator.user,
            type=Notification.Type.CREATOR_FOLLOWED,
            actor=self.other,
            creator=self.creator,
        )
        self.assertEqual(notifications.count(), 1)

    def test_comment_notifies_idea_creator_but_not_self_comment(self):
        self.client.force_login(self.other)
        url = reverse(
            "api:engagement:idea-comments",
            args=[self.idea.id],
        )
        other_comment = self.request_with_csrf(
            "post",
            url,
            {"body": "A useful response."},
        )
        self.assertEqual(other_comment.status_code, 201)

        notification = Notification.objects.get(
            type=Notification.Type.COMMENT_RECEIVED,
            comment_id=other_comment.json()["id"],
        )
        self.assertEqual(notification.recipient, self.creator.user)
        self.assertEqual(notification.actor, self.other)

        self.client.force_login(self.creator.user)
        self_comment = self.request_with_csrf(
            "post",
            url,
            {"body": "Creator reply on own idea."},
        )
        self.assertEqual(self_comment.status_code, 201)
        self.assertFalse(
            Notification.objects.filter(
                type=Notification.Type.COMMENT_RECEIVED,
                comment_id=self_comment.json()["id"],
            ).exists()
        )

    def test_hide_and_restore_notify_creator_without_exposing_moderator_actor(self):
        self.client.force_login(self.moderator)
        hide = self.request_with_csrf(
            "post",
            reverse(
                "api:moderation:idea-hide",
                args=[self.idea.id],
            ),
            {"note": "Moderation hide."},
        )
        self.assertEqual(hide.status_code, 200)

        restore = self.request_with_csrf(
            "post",
            reverse(
                "api:moderation:idea-restore",
                args=[self.idea.id],
            ),
            {"note": "Moderation restore."},
        )
        self.assertEqual(restore.status_code, 200)

        notifications = list(
            Notification.objects.filter(
                recipient=self.creator.user,
                idea=self.idea,
                type__in=(
                    Notification.Type.IDEA_HIDDEN,
                    Notification.Type.IDEA_RESTORED,
                ),
            ).order_by("id")
        )
        self.assertEqual(
            [item.type for item in notifications],
            [
                Notification.Type.IDEA_HIDDEN,
                Notification.Type.IDEA_RESTORED,
            ],
        )
        self.assertTrue(
            all(item.actor_id is None for item in notifications)
        )

        self.client.force_login(self.creator.user)
        listed = self.client.get(self.list_url)
        moderation_items = [
            item
            for item in listed.json()["results"]
            if item["id"] in {n.id for n in notifications}
        ]
        self.assertEqual(len(moderation_items), 2)
        self.assertTrue(
            all(item["actor"] is None for item in moderation_items)
        )
        self.assertTrue(
            all(
                item["target"]
                == {
                    "idea_id": self.idea.id,
                    "title": self.idea.title,
                }
                for item in moderation_items
            )
        )

    def test_failed_message_notification_rolls_back_message_transaction(self):
        with patch(
            "messaging.services.create_message_received_notification",
            side_effect=RuntimeError("notification insert failed"),
        ):
            with self.assertRaises(RuntimeError):
                send_message(
                    conversation=self.conversation,
                    sender=self.reader,
                    body="Must roll back together.",
                )

        self.assertFalse(
            Message.objects.filter(
                conversation=self.conversation,
                body="Must roll back together.",
            ).exists()
        )

    def test_comment_notification_target_omits_comment_body(self):
        body = "Private notification body should not be echoed."
        self.client.force_login(self.other)
        response = self.request_with_csrf(
            "post",
            reverse(
                "api:engagement:idea-comments",
                args=[self.idea.id],
            ),
            {"body": body},
        )
        self.assertEqual(response.status_code, 201)
        notification = Notification.objects.get(
            comment_id=response.json()["id"]
        )

        self.client.force_login(self.creator.user)
        listed = self.client.get(self.list_url)
        item = next(
            row
            for row in listed.json()["results"]
            if row["id"] == notification.id
        )
        self.assertEqual(
            item["target"],
            {
                "comment_id": response.json()["id"],
                "idea_id": self.idea.id,
            },
        )
        self.assertNotIn(body, str(item))
