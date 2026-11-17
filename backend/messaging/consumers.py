import logging

from channels.generic.websocket import AsyncJsonWebsocketConsumer

from .realtime import user_group_name


logger = logging.getLogger(__name__)


class MessagingConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        user = self.scope.get("user")
        if user is None or not user.is_authenticated:
            await self.close(code=4401)
            return

        self.group_name = user_group_name(user.id)
        try:
            await self.channel_layer.group_add(
                self.group_name,
                self.channel_name,
            )
        except Exception:
            logger.exception("Messaging WebSocket could not join its Redis group.")
            await self.close(code=1013)
            return

        await self.accept()
        await self.send_json(
            {
                "type": "sync.required",
                "reason": "connected",
            }
        )

    async def disconnect(self, close_code):
        group_name = getattr(self, "group_name", None)
        if group_name is None:
            return

        try:
            await self.channel_layer.group_discard(
                group_name,
                self.channel_name,
            )
        except Exception:
            logger.warning(
                "Messaging WebSocket could not leave its Redis group cleanly.",
                exc_info=True,
            )

    async def receive_json(self, content, **kwargs):
        if content.get("type") == "ping":
            await self.send_json({"type": "pong"})
            return

        await self.send_json(
            {
                "type": "error",
                "code": "rest_write_required",
                "detail": (
                    "Messaging writes use the REST API; WebSocket is delivery-only."
                ),
            }
        )

    async def messaging_event(self, event):
        await self.send_json(event["payload"])
