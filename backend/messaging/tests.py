from urllib.parse import urlsplit

from django.contrib.auth.models import Group
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from accounts.models import User
from accounts.permissions import MODERATOR_GROUP_NAME
from creators.models import CreatorProfile
from moderation.models import Report

from .models import Conversation, Message


class MessagingAPITests(TestCase):
    def setUp(self):
        self.client = APIClient(enforce_csrf_checks=True)
        self.reader = User.objects.create_user(
            email="reader@example.com",
            display_name="Reader",
        )
        self.other = User.objects.create_user(
            email="other@example.com",
            display_name="Other",
        )
        creator_user = User.objects.create_user(
            email="creator@example.com",
            display_name="Creator",
        )
        self.creator = CreatorProfile.objects.create(user=creator_user)
        second_creator_user = User.objects.create_user(
            email="creator-two@example.com",
            display_name="Creator Two",
        )
        self.creator_two = CreatorProfile.objects.create(
            user=second_creator_user
        )
        self.moderator = User.objects.create_user(
            email="moderator-messaging@example.com",
            display_name="Moderator",
            is_staff=True,
        )
        moderator_group = Group.objects.get(name=MODERATOR_GROUP_NAME)
        self.moderator.groups.add(moderator_group)

        self.csrf_url = reverse("api:accounts:csrf")
        self.conversations_url = reverse(
            "api:messaging:conversation-list-create"
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

    def start_conversation(self, *, reader=None, creator=None):
        self.client.force_login(reader or self.reader)
        response = self.request_with_csrf(
            "post",
            self.conversations_url,
            {"creator_id": (creator or self.creator).id},
        )
        self.assertIn(response.status_code, (200, 201))
        return Conversation.objects.get(pk=response.json()["id"])

    def message_url(self, conversation):
        return reverse(
            "api:messaging:conversation-messages",
            args=[conversation.id],
        )

    def read_url(self, conversation):
        return reverse(
            "api:messaging:conversation-read",
            args=[conversation.id],
        )

    def report_url(self, message):
        return reverse(
            "api:moderation:message-report",
            args=[message.id],
        )

    def test_start_conversation_creates_reader_creator_pair_with_safe_shape(self):
        self.client.force_login(self.reader)

        response = self.request_with_csrf(
            "post",
            self.conversations_url,
            {"creator_id": self.creator.id},
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(Conversation.objects.count(), 1)
        conversation = Conversation.objects.get()
        self.assertEqual(conversation.reader, self.reader)
        self.assertEqual(conversation.creator, self.creator)

        data = response.json()
        self.assertEqual(
            set(data),
            {
                "id",
                "reader",
                "creator",
                "viewer_role",
                "last_message",
                "unread_count",
                "created_at",
                "updated_at",
            },
        )
        self.assertEqual(data["viewer_role"], "reader")
        self.assertEqual(data["unread_count"], 0)
        self.assertIsNone(data["last_message"])
        self.assertEqual(data["reader"]["id"], self.reader.id)
        self.assertNotIn("email", data["reader"])
        self.assertEqual(data["creator"]["id"], self.creator.id)
        self.assertNotIn("email", data["creator"])

    def test_start_conversation_is_idempotent_for_same_reader_creator_pair(self):
        self.client.force_login(self.reader)

        first = self.request_with_csrf(
            "post",
            self.conversations_url,
            {"creator_id": self.creator.id},
        )
        second = self.request_with_csrf(
            "post",
            self.conversations_url,
            {"creator_id": self.creator.id},
        )

        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(first.json()["id"], second.json()["id"])
        self.assertEqual(Conversation.objects.count(), 1)

    def test_self_conversation_and_unknown_creator_are_rejected(self):
        self.client.force_login(self.creator.user)

        self_response = self.request_with_csrf(
            "post",
            self.conversations_url,
            {"creator_id": self.creator.id},
        )
        missing_response = self.request_with_csrf(
            "post",
            self.conversations_url,
            {"creator_id": 99999999},
        )

        self.assertEqual(self_response.status_code, 400)
        self.assertIn("creator_id", self_response.json())
        self.assertEqual(missing_response.status_code, 400)
        self.assertIn("creator_id", missing_response.json())
        self.assertFalse(Conversation.objects.exists())

    def test_list_contains_only_viewer_conversations_and_current_role(self):
        reader_conversation = self.start_conversation()
        self.start_conversation(reader=self.other, creator=self.creator_two)

        self.client.force_login(self.reader)
        reader_list = self.client.get(self.conversations_url)
        self.assertEqual(reader_list.status_code, 200)
        self.assertEqual(
            [item["id"] for item in reader_list.json()["results"]],
            [reader_conversation.id],
        )
        self.assertEqual(
            reader_list.json()["results"][0]["viewer_role"],
            "reader",
        )

        self.client.force_login(self.creator.user)
        creator_list = self.client.get(self.conversations_url)
        self.assertEqual(creator_list.status_code, 200)
        self.assertEqual(
            [item["id"] for item in creator_list.json()["results"]],
            [reader_conversation.id],
        )
        self.assertEqual(
            creator_list.json()["results"][0]["viewer_role"],
            "creator",
        )

    def test_reader_and_creator_can_send_persistent_messages(self):
        conversation = self.start_conversation()
        self.client.force_login(self.reader)

        reader_message = self.request_with_csrf(
            "post",
            self.message_url(conversation),
            {"body": "  Hello creator.  "},
        )
        self.assertEqual(reader_message.status_code, 201)
        self.assertEqual(reader_message.json()["body"], "Hello creator.")
        self.assertFalse(reader_message.json()["is_read"])

        self.client.force_login(self.creator.user)
        creator_message = self.request_with_csrf(
            "post",
            self.message_url(conversation),
            {"body": "Hello reader."},
        )
        self.assertEqual(creator_message.status_code, 201)

        messages = Message.objects.filter(
            conversation=conversation
        ).order_by("id")
        self.assertEqual(messages.count(), 2)
        self.assertEqual(messages[0].sender, self.reader)
        self.assertEqual(messages[1].sender, self.creator.user)

    def test_message_body_is_required_trimmed_and_bounded(self):
        conversation = self.start_conversation()
        self.client.force_login(self.reader)

        blank = self.request_with_csrf(
            "post",
            self.message_url(conversation),
            {"body": "   "},
        )
        too_long = self.request_with_csrf(
            "post",
            self.message_url(conversation),
            {"body": "x" * 4001},
        )

        self.assertEqual(blank.status_code, 400)
        self.assertIn("body", blank.json())
        self.assertEqual(too_long.status_code, 400)
        self.assertIn("body", too_long.json())
        self.assertFalse(Message.objects.exists())

    def test_nonparticipant_cannot_read_send_or_mark_conversation_read(self):
        conversation = self.start_conversation()
        Message.objects.create(
            conversation=conversation,
            sender=self.reader,
            body="Private message",
        )
        self.client.force_login(self.other)

        history = self.client.get(self.message_url(conversation))
        send = self.request_with_csrf(
            "post",
            self.message_url(conversation),
            {"body": "Intrusion"},
        )
        mark = self.request_with_csrf(
            "post",
            self.read_url(conversation),
        )

        self.assertEqual(history.status_code, 404)
        self.assertEqual(send.status_code, 404)
        self.assertEqual(mark.status_code, 404)
        self.assertEqual(Message.objects.count(), 1)

    def test_history_is_cursor_paginated_newest_first_without_duplicates(self):
        conversation = self.start_conversation()
        messages = [
            Message.objects.create(
                conversation=conversation,
                sender=self.reader if index % 2 == 0 else self.creator.user,
                body=f"Message {index}",
            )
            for index in range(55)
        ]
        self.client.force_login(self.reader)

        first = self.client.get(self.message_url(conversation))
        self.assertEqual(first.status_code, 200)
        self.assertEqual(len(first.json()["results"]), 50)
        self.assertIsNotNone(first.json()["next"])

        next_url = urlsplit(first.json()["next"])
        second = self.client.get(f"{next_url.path}?{next_url.query}")
        self.assertEqual(second.status_code, 200)
        self.assertEqual(len(second.json()["results"]), 5)

        returned_ids = [
            item["id"]
            for response in (first, second)
            for item in response.json()["results"]
        ]
        expected_ids = [message.id for message in reversed(messages)]
        self.assertEqual(returned_ids, expected_ids)
        self.assertEqual(len(returned_ids), len(set(returned_ids)))

    def test_unread_counts_and_explicit_read_endpoint_track_receiver_state(self):
        conversation = self.start_conversation()
        self.client.force_login(self.reader)
        sent = self.request_with_csrf(
            "post",
            self.message_url(conversation),
            {"body": "Unread for creator"},
        )
        message = Message.objects.get(pk=sent.json()["id"])

        self.client.force_login(self.creator.user)
        before = self.client.get(self.conversations_url)
        item = before.json()["results"][0]
        self.assertEqual(item["unread_count"], 1)
        self.assertEqual(item["last_message"]["id"], message.id)
        self.assertFalse(item["last_message"]["is_read"])

        marked = self.request_with_csrf(
            "post",
            self.read_url(conversation),
        )
        self.assertEqual(marked.status_code, 200)
        self.assertEqual(marked.json()["marked_read"], 1)
        self.assertEqual(marked.json()["unread_count"], 0)

        message.refresh_from_db()
        self.assertIsNotNone(message.read_at)
        after = self.client.get(self.conversations_url)
        self.assertEqual(after.json()["results"][0]["unread_count"], 0)
        self.assertTrue(
            after.json()["results"][0]["last_message"]["is_read"]
        )

        again = self.request_with_csrf(
            "post",
            self.read_url(conversation),
        )
        self.assertEqual(again.status_code, 200)
        self.assertEqual(again.json()["marked_read"], 0)

    def test_sending_message_moves_conversation_to_top(self):
        first = self.start_conversation(creator=self.creator)
        second = self.start_conversation(creator=self.creator_two)
        self.client.force_login(self.reader)

        initial = self.client.get(self.conversations_url)
        self.assertEqual(
            [item["id"] for item in initial.json()["results"]],
            [second.id, first.id],
        )

        sent = self.request_with_csrf(
            "post",
            self.message_url(first),
            {"body": "Move this conversation to the top."},
        )
        self.assertEqual(sent.status_code, 201)

        refreshed = self.client.get(self.conversations_url)
        self.assertEqual(
            [item["id"] for item in refreshed.json()["results"]],
            [first.id, second.id],
        )

    def test_message_excerpt_is_bounded_to_160_unicode_characters(self):
        conversation = self.start_conversation()
        body = "ایدهٔ فارسی " * 20
        self.assertGreater(len(body), 160)
        Message.objects.create(
            conversation=conversation,
            sender=self.creator.user,
            body=body,
        )
        conversation.save()
        self.client.force_login(self.reader)

        response = self.client.get(self.conversations_url)

        excerpt = response.json()["results"][0]["last_message"]["body_excerpt"]
        self.assertEqual(excerpt, body[:159] + "…")
        self.assertEqual(len(excerpt), 160)

    def test_mutating_messaging_endpoints_require_authentication_and_csrf(self):
        anonymous_list = self.client.get(self.conversations_url)
        anonymous_start = self.client.post(
            self.conversations_url,
            {"creator_id": self.creator.id},
            format="json",
        )
        self.assertEqual(anonymous_list.status_code, 403)
        self.assertEqual(anonymous_start.status_code, 403)

        self.client.force_login(self.reader)
        no_csrf_start = self.client.post(
            self.conversations_url,
            {"creator_id": self.creator.id},
            format="json",
        )
        self.assertEqual(no_csrf_start.status_code, 403)

        conversation = self.start_conversation()
        no_csrf_send = self.client.post(
            self.message_url(conversation),
            {"body": "No CSRF"},
            format="json",
        )
        no_csrf_read = self.client.post(
            self.read_url(conversation),
            {},
            format="json",
        )
        self.assertEqual(no_csrf_send.status_code, 403)
        self.assertEqual(no_csrf_read.status_code, 403)

    def test_recipient_can_report_message_into_existing_moderation_queue(self):
        conversation = self.start_conversation()
        message = Message.objects.create(
            conversation=conversation,
            sender=self.creator.user,
            body="Reported private message",
        )
        self.client.force_login(self.reader)

        response = self.request_with_csrf(
            "post",
            self.report_url(message),
            {
                "reason": Report.Reason.HARASSMENT,
                "details": "  Please review this message.  ",
            },
        )

        self.assertEqual(response.status_code, 201)
        report = Report.objects.get(pk=response.json()["id"])
        self.assertEqual(report.reporter, self.reader)
        self.assertEqual(report.target_type, Report.TargetType.MESSAGE)
        self.assertEqual(report.target_id, message.id)
        self.assertEqual(report.reason, Report.Reason.HARASSMENT)
        self.assertEqual(report.details, "Please review this message.")

        self.client.force_login(self.moderator)
        detail = self.client.get(
            reverse(
                "api:moderation:report-detail",
                args=[report.id],
            )
        )
        self.assertEqual(detail.status_code, 200)
        target = detail.json()["target_message"]
        self.assertEqual(
            set(target),
            {
                "id",
                "conversation_id",
                "sender",
                "body",
                "created_at",
                "read_at",
            },
        )
        self.assertEqual(target["id"], message.id)
        self.assertEqual(target["body"], message.body)
        self.assertNotIn("email", target["sender"])
        self.assertIsNone(detail.json()["target_comment"])
        self.assertIsNone(detail.json()["target_idea"])

    def test_own_or_unrelated_message_cannot_be_reported(self):
        conversation = self.start_conversation()
        own_message = Message.objects.create(
            conversation=conversation,
            sender=self.reader,
            body="Reader's own message",
        )
        incoming = Message.objects.create(
            conversation=conversation,
            sender=self.creator.user,
            body="Creator message",
        )

        self.client.force_login(self.reader)
        own = self.request_with_csrf(
            "post",
            self.report_url(own_message),
            {"reason": Report.Reason.SPAM},
        )

        self.client.force_login(self.other)
        unrelated = self.request_with_csrf(
            "post",
            self.report_url(incoming),
            {"reason": Report.Reason.SPAM},
        )

        self.assertEqual(own.status_code, 404)
        self.assertEqual(unrelated.status_code, 404)
        self.assertFalse(Report.objects.filter(
            target_type=Report.TargetType.MESSAGE
        ).exists())

    def test_message_report_requires_csrf_and_bounded_valid_input(self):
        conversation = self.start_conversation()
        message = Message.objects.create(
            conversation=conversation,
            sender=self.creator.user,
            body="Report validation",
        )
        self.client.force_login(self.reader)
        url = self.report_url(message)

        no_csrf = self.client.post(
            url,
            {"reason": Report.Reason.SPAM},
            format="json",
        )
        bad_reason = self.request_with_csrf(
            "post",
            url,
            {"reason": "not-a-reason"},
        )
        long_details = self.request_with_csrf(
            "post",
            url,
            {
                "reason": Report.Reason.OTHER,
                "details": "x" * 2001,
            },
        )

        self.assertEqual(no_csrf.status_code, 403)
        self.assertEqual(bad_reason.status_code, 400)
        self.assertIn("reason", bad_reason.json())
        self.assertEqual(long_details.status_code, 400)
        self.assertIn("details", long_details.json())
        self.assertFalse(Report.objects.filter(
            target_type=Report.TargetType.MESSAGE
        ).exists())
