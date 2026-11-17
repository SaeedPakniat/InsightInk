from unittest.mock import patch

from asgiref.sync import async_to_sync
from asgiref.sync import sync_to_async
from channels.testing import WebsocketCommunicator
from django.conf import settings
from django.test import TransactionTestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIClient

from accounts.models import User
from config.asgi import application
from creators.models import CreatorProfile

from .models import Conversation, Message


TEST_CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
    }
}


@override_settings(
    ALLOWED_HOSTS=["localhost", "testserver"],
    CHANNEL_LAYERS=TEST_CHANNEL_LAYERS,
)
class MessagingRealtimeTests(TransactionTestCase):
    reset_sequences = True

    def setUp(self):
        self.reader = User.objects.create_user(
            email="realtime-reader@example.com",
            display_name="Realtime Reader",
        )
        self.other = User.objects.create_user(
            email="realtime-other@example.com",
            display_name="Realtime Other",
        )
        creator_user = User.objects.create_user(
            email="realtime-creator@example.com",
            display_name="Realtime Creator",
        )
        self.creator = CreatorProfile.objects.create(user=creator_user)
        creator_two_user = User.objects.create_user(
            email="realtime-creator-two@example.com",
            display_name="Realtime Creator Two",
        )
        self.creator_two = CreatorProfile.objects.create(
            user=creator_two_user
        )
        self.conversation = Conversation.objects.create(
            reader=self.reader,
            creator=self.creator,
        )
        self.csrf_url = reverse("api:accounts:csrf")
        self.conversations_url = reverse(
            "api:messaging:conversation-list-create"
        )
        self.anonymous_headers = self.websocket_headers()
        self.socket_headers = {
            self.reader.id: self.websocket_headers(self.reader),
            self.other.id: self.websocket_headers(self.other),
            self.creator.user_id: self.websocket_headers(
                self.creator.user
            ),
            self.creator_two.user_id: self.websocket_headers(
                self.creator_two.user
            ),
        }
        self.reader_second_session_headers = self.websocket_headers(
            self.reader
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

    def message_url(self, conversation=None):
        conversation = conversation or self.conversation
        return reverse(
            "api:messaging:conversation-messages",
            args=[conversation.id],
        )

    def read_url(self, conversation=None):
        conversation = conversation or self.conversation
        return reverse(
            "api:messaging:conversation-read",
            args=[conversation.id],
        )

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

    def test_anonymous_websocket_is_rejected(self):
        async def scenario():
            communicator = WebsocketCommunicator(
                application,
                "/ws/messaging/",
                headers=self.anonymous_headers,
            )
            connected, _close_code = await communicator.connect()
            self.assertFalse(connected)

        async_to_sync(scenario)()

    def test_authenticated_websocket_connects_and_ping_is_non_mutating(self):
        async def scenario():
            communicator = await self.connect_user(self.reader)
            try:
                await communicator.send_json_to({"type": "ping"})
                response = await communicator.receive_json_from()
                self.assertEqual(response, {"type": "pong"})
            finally:
                await communicator.disconnect()

        async_to_sync(scenario)()

    def test_websocket_rejects_message_writes_and_does_not_persist(self):
        async def scenario():
            communicator = await self.connect_user(self.reader)
            try:
                await communicator.send_json_to(
                    {
                        "type": "message.send",
                        "conversation_id": self.conversation.id,
                        "body": "This must not be persisted.",
                    }
                )
                response = await communicator.receive_json_from()
                self.assertEqual(response["type"], "error")
                self.assertEqual(
                    response["code"],
                    "rest_write_required",
                )
                count = await sync_to_async(
                    Message.objects.filter(
                        conversation=self.conversation
                    ).count,
                    thread_sensitive=True,
                )()
                self.assertEqual(count, 0)
            finally:
                await communicator.disconnect()

        async_to_sync(scenario)()

    def test_rest_send_persists_then_delivers_to_both_participants(self):
        async def scenario():
            reader_socket = await self.connect_user(self.reader)
            creator_socket = await self.connect_user(self.creator.user)
            try:
                response = await sync_to_async(
                    self.api_request,
                    thread_sensitive=True,
                )(
                    self.reader,
                    "post",
                    self.message_url(),
                    {"body": "Persist me before delivery."},
                )
                self.assertEqual(response.status_code, 201)
                message_id = response.json()["id"]

                persisted = await sync_to_async(
                    Message.objects.filter(pk=message_id).exists,
                    thread_sensitive=True,
                )()
                self.assertTrue(persisted)

                reader_event = await reader_socket.receive_json_from()
                creator_event = await creator_socket.receive_json_from()
                self.assertEqual(reader_event, creator_event)
                self.assertEqual(
                    reader_event["type"],
                    "message.created",
                )
                self.assertEqual(
                    reader_event["message"]["id"],
                    message_id,
                )
                self.assertEqual(
                    reader_event["message"]["conversation_id"],
                    self.conversation.id,
                )
                self.assertEqual(
                    reader_event["message"]["body"],
                    "Persist me before delivery.",
                )
                self.assertEqual(
                    reader_event["message"]["sender"]["id"],
                    self.reader.id,
                )
            finally:
                await reader_socket.disconnect()
                await creator_socket.disconnect()

        async_to_sync(scenario)()

    def test_unrelated_authenticated_socket_receives_no_private_event(self):
        async def scenario():
            outsider_socket = await self.connect_user(self.other)
            try:
                response = await sync_to_async(
                    self.api_request,
                    thread_sensitive=True,
                )(
                    self.reader,
                    "post",
                    self.message_url(),
                    {"body": "Private event."},
                )
                self.assertEqual(response.status_code, 201)
                self.assertTrue(
                    await outsider_socket.receive_nothing(timeout=0.15)
                )
            finally:
                await outsider_socket.disconnect()

        async_to_sync(scenario)()

    def test_two_sessions_for_same_user_receive_same_live_message(self):
        async def scenario():
            reader_device_one = await self.connect_user(self.reader)
            reader_device_two = await self.connect_user(
                self.reader,
                headers=self.reader_second_session_headers,
            )
            creator_socket = await self.connect_user(self.creator.user)
            try:
                response = await sync_to_async(
                    self.api_request,
                    thread_sensitive=True,
                )(
                    self.creator.user,
                    "post",
                    self.message_url(),
                    {"body": "Cross-device live message."},
                )
                self.assertEqual(response.status_code, 201)

                first = await reader_device_one.receive_json_from()
                second = await reader_device_two.receive_json_from()
                sender_copy = await creator_socket.receive_json_from()
                self.assertEqual(first, second)
                self.assertEqual(first, sender_copy)
                self.assertEqual(first["type"], "message.created")
            finally:
                await reader_device_one.disconnect()
                await reader_device_two.disconnect()
                await creator_socket.disconnect()

        async_to_sync(scenario)()

    def test_mark_read_broadcasts_read_event_without_websocket_write(self):
        message = Message.objects.create(
            conversation=self.conversation,
            sender=self.reader,
            body="Unread for creator",
        )

        async def scenario():
            reader_socket = await self.connect_user(self.reader)
            creator_socket = await self.connect_user(self.creator.user)
            try:
                response = await sync_to_async(
                    self.api_request,
                    thread_sensitive=True,
                )(
                    self.creator.user,
                    "post",
                    self.read_url(),
                )
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.json()["marked_read"], 1)

                reader_event = await reader_socket.receive_json_from()
                creator_event = await creator_socket.receive_json_from()
                self.assertEqual(reader_event, creator_event)
                self.assertEqual(
                    reader_event["type"],
                    "messages.read",
                )
                self.assertEqual(
                    reader_event["conversation_id"],
                    self.conversation.id,
                )
                self.assertEqual(
                    reader_event["read_by_user_id"],
                    self.creator.user_id,
                )
                self.assertEqual(reader_event["marked_read"], 1)

                read_at = await sync_to_async(
                    lambda: Message.objects.get(
                        pk=message.pk
                    ).read_at,
                    thread_sensitive=True,
                )()
                self.assertIsNotNone(read_at)
            finally:
                await reader_socket.disconnect()
                await creator_socket.disconnect()

        async_to_sync(scenario)()

    def test_new_conversation_broadcasts_only_after_rest_creation(self):
        async def scenario():
            reader_socket = await self.connect_user(self.reader)
            creator_socket = await self.connect_user(
                self.creator_two.user
            )
            try:
                response = await sync_to_async(
                    self.api_request,
                    thread_sensitive=True,
                )(
                    self.reader,
                    "post",
                    self.conversations_url,
                    {"creator_id": self.creator_two.id},
                )
                self.assertEqual(response.status_code, 201)
                conversation_id = response.json()["id"]

                exists = await sync_to_async(
                    Conversation.objects.filter(
                        pk=conversation_id
                    ).exists,
                    thread_sensitive=True,
                )()
                self.assertTrue(exists)

                reader_event = await reader_socket.receive_json_from()
                creator_event = await creator_socket.receive_json_from()
                self.assertEqual(reader_event, creator_event)
                self.assertEqual(
                    reader_event["type"],
                    "conversation.created",
                )
                self.assertEqual(
                    reader_event["conversation"]["id"],
                    conversation_id,
                )
                self.assertEqual(
                    reader_event["conversation"]["creator"]["id"],
                    self.creator_two.id,
                )
            finally:
                await reader_socket.disconnect()
                await creator_socket.disconnect()

        async_to_sync(scenario)()

    def test_reconnect_requests_rest_resync_instead_of_replaying_events(self):
        async def scenario():
            reader_socket = await self.connect_user(self.reader)
            await reader_socket.disconnect()

            response = await sync_to_async(
                self.api_request,
                thread_sensitive=True,
            )(
                self.creator.user,
                "post",
                self.message_url(),
                {"body": "Created while reader was offline."},
            )
            self.assertEqual(response.status_code, 201)
            message_id = response.json()["id"]

            reconnected = await self.connect_user(self.reader)
            try:
                self.assertTrue(
                    await reconnected.receive_nothing(timeout=0.15)
                )
                history = await sync_to_async(
                    self.api_get,
                    thread_sensitive=True,
                )(
                    self.reader,
                    self.message_url(),
                )
                self.assertEqual(history.status_code, 200)
                returned_ids = [
                    item["id"]
                    for item in history.json()["results"]
                ]
                self.assertIn(message_id, returned_ids)
            finally:
                await reconnected.disconnect()

        async_to_sync(scenario)()

    def test_realtime_delivery_failure_does_not_roll_back_rest_message(self):
        with patch(
            "messaging.realtime.get_channel_layer",
            side_effect=ConnectionError("Redis unavailable"),
        ):
            response = self.api_request(
                self.reader,
                "post",
                self.message_url(),
                {"body": "Database remains authoritative."},
            )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(
            Message.objects.filter(
                pk=response.json()["id"],
                body="Database remains authoritative.",
            ).exists()
        )
