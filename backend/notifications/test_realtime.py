from unittest.mock import patch

from asgiref.sync import async_to_sync, sync_to_async
from channels.testing import WebsocketCommunicator
from django.conf import settings
from django.contrib.auth.models import Group
from django.db import transaction
from django.test import TransactionTestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIClient

from accounts.models import User
from accounts.permissions import MODERATOR_GROUP_NAME
from config.asgi import application
from content.models import Idea, Source
from creators.models import CreatorFollow, CreatorProfile
from messaging.models import Conversation
from notifications.models import Notification
from notifications.services import create_creator_followed_notification


TEST_CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
    }
}


@override_settings(
    ALLOWED_HOSTS=["localhost", "testserver"],
    CHANNEL_LAYERS=TEST_CHANNEL_LAYERS,
)
class NotificationRealtimeTests(TransactionTestCase):
    reset_sequences = True

    def setUp(self):
        self.reader = User.objects.create_user(
            email="notif-rt-reader@example.com",
            display_name="Realtime Reader",
        )
        self.other = User.objects.create_user(
            email="notif-rt-other@example.com",
            display_name="Realtime Other",
        )
        creator_user = User.objects.create_user(
            email="notif-rt-creator@example.com",
            display_name="Realtime Creator",
        )
        self.creator = CreatorProfile.objects.create(user=creator_user)
        self.moderator = User.objects.create_user(
            email="notif-rt-moderator@example.com",
            display_name="Realtime Moderator",
            is_staff=True,
        )
        moderator_group, _ = Group.objects.get_or_create(
            name=MODERATOR_GROUP_NAME
        )
        moderator_group.user_set.add(self.moderator)

        self.source = Source.objects.create(
            type=Source.SourceType.BOOK,
            title="Notification realtime source",
            language="en",
        )
        self.idea = Idea.objects.create(
            creator=self.creator,
            source=self.source,
            language="en",
            title="Notification realtime idea",
            body="Body",
            estimated_read_seconds=60,
            status=Idea.IdeaStatus.PUBLISHED,
        )
        self.conversation = Conversation.objects.create(
            reader=self.reader,
            creator=self.creator,
        )

        self.csrf_url = reverse("api:accounts:csrf")
        self.notification_list_url = reverse(
            "api:notifications:notification-list"
        )
        self.unread_url = reverse(
            "api:notifications:notification-unread-count"
        )
        self.anonymous_headers = self.websocket_headers()
        self.socket_headers = {
            self.reader.id: self.websocket_headers(self.reader),
            self.other.id: self.websocket_headers(self.other),
            self.creator.user_id: self.websocket_headers(
                self.creator.user
            ),
            self.moderator.id: self.websocket_headers(self.moderator),
        }
        self.creator_second_session_headers = self.websocket_headers(
            self.creator.user
        )

    def websocket_headers(self, user=None):
        headers = [
            (b"host", b"testserver"),
            (b"origin", b"http://testserver"),
        ]
        if user is None:
            return headers

        client = APIClient()
        client.force_login(user)
        session_value = client.cookies[
            settings.SESSION_COOKIE_NAME
        ].value
        headers.append(
            (
                b"cookie",
                (
                    f"{settings.SESSION_COOKIE_NAME}="
                    f"{session_value}"
                ).encode(),
            )
        )
        return headers

    def api_request(self, user, method, url, data=None):
        client = APIClient(enforce_csrf_checks=True)
        client.force_login(user)
        csrf_response = client.get(self.csrf_url)
        self.assertEqual(csrf_response.status_code, 200)
        token = csrf_response.json()["csrfToken"]
        return getattr(client, method)(
            url,
            data=data or {},
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )

    def api_get(self, user, url):
        client = APIClient()
        client.force_login(user)
        return client.get(url)

    async def connect_user(self, user, headers=None):
        communicator = WebsocketCommunicator(
            application,
            "/ws/messaging/",
            headers=headers or self.socket_headers[user.id],
        )
        connected, detail = await communicator.connect()
        self.assertTrue(connected, detail)
        initial = await communicator.receive_json_from()
        self.assertEqual(
            initial,
            {
                "type": "sync.required",
                "reason": "connected",
            },
        )
        return communicator

    def message_url(self):
        return reverse(
            "api:messaging:conversation-messages",
            args=[self.conversation.id],
        )

    def follow_url(self):
        return reverse(
            "api:creators:creator-follow",
            args=[self.creator.id],
        )

    def comment_url(self):
        return reverse(
            "api:engagement:idea-comments",
            args=[self.idea.id],
        )

    def hide_url(self):
        return reverse(
            "api:moderation:idea-hide",
            args=[self.idea.id],
        )

    def restore_url(self):
        return reverse(
            "api:moderation:idea-restore",
            args=[self.idea.id],
        )

    def test_anonymous_socket_cannot_receive_private_events(self):
        async def scenario():
            communicator = WebsocketCommunicator(
                application,
                "/ws/messaging/",
                headers=self.anonymous_headers,
            )
            connected, _close_code = await communicator.connect()
            self.assertFalse(connected)

        async_to_sync(scenario)()

    def test_message_received_delivers_exact_minimal_event_to_recipient(self):
        async def scenario():
            creator_socket = await self.connect_user(self.creator.user)
            try:
                response = await sync_to_async(
                    self.api_request,
                    thread_sensitive=True,
                )(
                    self.reader,
                    "post",
                    self.message_url(),
                    {"body": "Realtime notification message"},
                )
                self.assertEqual(response.status_code, 201)

                notification = await sync_to_async(
                    Notification.objects.get,
                    thread_sensitive=True,
                )(
                    type=Notification.Type.MESSAGE_RECEIVED,
                    message_id=response.json()["id"],
                )
                event = await creator_socket.receive_json_from()
                self.assertEqual(
                    event,
                    {
                        "type": "notification.created",
                        "notification_id": notification.id,
                        "notification_type": (
                            Notification.Type.MESSAGE_RECEIVED
                        ),
                    },
                )
                self.assertEqual(
                    set(event),
                    {
                        "type",
                        "notification_id",
                        "notification_type",
                    },
                )
            finally:
                await creator_socket.disconnect()

        async_to_sync(scenario)()

    def test_unrelated_authenticated_user_receives_no_notification_event(self):
        async def scenario():
            creator_socket = await self.connect_user(self.creator.user)
            other_socket = await self.connect_user(self.other)
            try:
                response = await sync_to_async(
                    self.api_request,
                    thread_sensitive=True,
                )(
                    self.reader,
                    "post",
                    self.message_url(),
                    {"body": "Private recipient event"},
                )
                self.assertEqual(response.status_code, 201)

                event = await creator_socket.receive_json_from()
                self.assertEqual(event["type"], "notification.created")
                self.assertTrue(
                    await other_socket.receive_nothing(timeout=0.05)
                )
            finally:
                await creator_socket.disconnect()
                await other_socket.disconnect()

        async_to_sync(scenario)()

    def test_multiple_recipient_sessions_receive_same_notification_event(self):
        async def scenario():
            first = await self.connect_user(self.creator.user)
            second = await self.connect_user(
                self.creator.user,
                headers=self.creator_second_session_headers,
            )
            try:
                response = await sync_to_async(
                    self.api_request,
                    thread_sensitive=True,
                )(
                    self.other,
                    "put",
                    self.follow_url(),
                )
                self.assertEqual(response.status_code, 204)

                first_event = await first.receive_json_from()
                second_event = await second.receive_json_from()
                self.assertEqual(first_event, second_event)
                self.assertEqual(
                    first_event["notification_type"],
                    Notification.Type.CREATOR_FOLLOWED,
                )
            finally:
                await first.disconnect()
                await second.disconnect()

        async_to_sync(scenario)()

    def test_event_is_scheduled_only_after_database_commit(self):
        with patch(
            "notifications.realtime.publish_user_event"
        ) as publisher:
            with transaction.atomic():
                follow = CreatorFollow.objects.create(
                    user=self.other,
                    creator=self.creator,
                )
                notification = create_creator_followed_notification(
                    follow=follow
                )
                self.assertFalse(publisher.called)

            publisher.assert_called_once_with(
                (self.creator.user_id,),
                {
                    "type": "notification.created",
                    "notification_id": notification.id,
                    "notification_type": (
                        Notification.Type.CREATOR_FOLLOWED
                    ),
                },
            )

    def test_rolled_back_notification_emits_no_realtime_event(self):
        with patch(
            "notifications.realtime.publish_user_event"
        ) as publisher:
            with self.assertRaises(RuntimeError):
                with transaction.atomic():
                    follow = CreatorFollow.objects.create(
                        user=self.other,
                        creator=self.creator,
                    )
                    notification = create_creator_followed_notification(
                        follow=follow
                    )
                    notification_id = notification.id
                    raise RuntimeError("rollback")

            publisher.assert_not_called()
            self.assertFalse(
                Notification.objects.filter(pk=notification_id).exists()
            )

    def test_creator_followed_emits_notification_created(self):
        async def scenario():
            socket = await self.connect_user(self.creator.user)
            try:
                response = await sync_to_async(
                    self.api_request,
                    thread_sensitive=True,
                )(
                    self.other,
                    "put",
                    self.follow_url(),
                )
                self.assertEqual(response.status_code, 204)
                event = await socket.receive_json_from()
                self.assertEqual(
                    event["notification_type"],
                    Notification.Type.CREATOR_FOLLOWED,
                )
            finally:
                await socket.disconnect()

        async_to_sync(scenario)()

    def test_comment_received_emits_notification_created(self):
        async def scenario():
            socket = await self.connect_user(self.creator.user)
            try:
                response = await sync_to_async(
                    self.api_request,
                    thread_sensitive=True,
                )(
                    self.other,
                    "post",
                    self.comment_url(),
                    {"body": "Comment for notification realtime"},
                )
                self.assertEqual(response.status_code, 201)
                event = await socket.receive_json_from()
                self.assertEqual(
                    event["notification_type"],
                    Notification.Type.COMMENT_RECEIVED,
                )
                self.assertEqual(
                    set(event),
                    {
                        "type",
                        "notification_id",
                        "notification_type",
                    },
                )
            finally:
                await socket.disconnect()

        async_to_sync(scenario)()

    def test_idea_hidden_emits_notification_created(self):
        async def scenario():
            socket = await self.connect_user(self.creator.user)
            try:
                response = await sync_to_async(
                    self.api_request,
                    thread_sensitive=True,
                )(
                    self.moderator,
                    "post",
                    self.hide_url(),
                    {"note": "Realtime hide"},
                )
                self.assertEqual(response.status_code, 200)
                event = await socket.receive_json_from()
                self.assertEqual(
                    event["notification_type"],
                    Notification.Type.IDEA_HIDDEN,
                )
            finally:
                await socket.disconnect()

        async_to_sync(scenario)()

    def test_idea_restored_emits_notification_created(self):
        hide = self.api_request(
            self.moderator,
            "post",
            self.hide_url(),
            {"note": "Hide before restore"},
        )
        self.assertEqual(hide.status_code, 200)

        async def scenario():
            socket = await self.connect_user(self.creator.user)
            try:
                response = await sync_to_async(
                    self.api_request,
                    thread_sensitive=True,
                )(
                    self.moderator,
                    "post",
                    self.restore_url(),
                    {"note": "Realtime restore"},
                )
                self.assertEqual(response.status_code, 200)
                event = await socket.receive_json_from()
                self.assertEqual(
                    event["notification_type"],
                    Notification.Type.IDEA_RESTORED,
                )
            finally:
                await socket.disconnect()

        async_to_sync(scenario)()

    def test_realtime_failure_preserves_notification_rest_and_unread_state(self):
        with patch(
            "messaging.realtime.get_channel_layer",
            side_effect=ConnectionError("Redis unavailable"),
        ):
            response = self.api_request(
                self.other,
                "put",
                self.follow_url(),
            )

        self.assertEqual(response.status_code, 204)
        notification = Notification.objects.get(
            recipient=self.creator.user,
            type=Notification.Type.CREATOR_FOLLOWED,
            actor=self.other,
        )
        self.assertIsNotNone(notification.id)

        listed = self.api_get(
            self.creator.user,
            self.notification_list_url,
        )
        self.assertEqual(listed.status_code, 200)
        self.assertIn(
            notification.id,
            [item["id"] for item in listed.json()["results"]],
        )

        unread = self.api_get(self.creator.user, self.unread_url)
        self.assertEqual(unread.status_code, 200)
        self.assertEqual(unread.json(), {"unread_count": 1})

    def test_reconnect_sync_required_recovers_missed_notification_via_rest(self):
        async def scenario():
            socket = await self.connect_user(self.creator.user)
            await socket.disconnect()

            response = await sync_to_async(
                self.api_request,
                thread_sensitive=True,
            )(
                self.other,
                "put",
                self.follow_url(),
            )
            self.assertEqual(response.status_code, 204)

            reconnected = await self.connect_user(self.creator.user)
            try:
                self.assertTrue(
                    await reconnected.receive_nothing(timeout=0.05)
                )
                listed = await sync_to_async(
                    self.api_get,
                    thread_sensitive=True,
                )(
                    self.creator.user,
                    self.notification_list_url,
                )
                unread = await sync_to_async(
                    self.api_get,
                    thread_sensitive=True,
                )(
                    self.creator.user,
                    self.unread_url,
                )
                self.assertEqual(listed.status_code, 200)
                self.assertEqual(len(listed.json()["results"]), 1)
                self.assertEqual(
                    listed.json()["results"][0]["type"],
                    Notification.Type.CREATOR_FOLLOWED,
                )
                self.assertEqual(
                    unread.json(),
                    {"unread_count": 1},
                )
            finally:
                await reconnected.disconnect()

        async_to_sync(scenario)()

    def test_message_send_keeps_existing_message_event_and_adds_notification_event(self):
        async def scenario():
            creator_socket = await self.connect_user(self.creator.user)
            reader_socket = await self.connect_user(self.reader)
            try:
                response = await sync_to_async(
                    self.api_request,
                    thread_sensitive=True,
                )(
                    self.reader,
                    "post",
                    self.message_url(),
                    {"body": "Both UI concerns"},
                )
                self.assertEqual(response.status_code, 201)

                creator_first = await creator_socket.receive_json_from()
                creator_second = await creator_socket.receive_json_from()
                reader_event = await reader_socket.receive_json_from()

                self.assertEqual(
                    creator_first["type"],
                    "notification.created",
                )
                self.assertEqual(
                    creator_second["type"],
                    "message.created",
                )
                self.assertEqual(
                    reader_event["type"],
                    "message.created",
                )
            finally:
                await creator_socket.disconnect()
                await reader_socket.disconnect()

        async_to_sync(scenario)()
