import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction


logger = logging.getLogger(__name__)


def user_group_name(user_id):
    return f"messaging.user.{int(user_id)}"


def _participant_user_ids(conversation):
    return tuple(
        dict.fromkeys(
            (
                conversation.reader_id,
                conversation.creator.user_id,
            )
        )
    )


def publish_user_event(user_ids, payload):
    try:
        channel_layer = get_channel_layer()
        if channel_layer is None:
            logger.warning("Account realtime event skipped: no channel layer.")
            return

        for user_id in user_ids:
            async_to_sync(channel_layer.group_send)(
                user_group_name(user_id),
                {
                    "type": "messaging.event",
                    "payload": payload,
                },
            )
    except Exception:
        logger.exception(
            "Account realtime delivery failed; persisted database state remains authoritative."
        )


def schedule_conversation_created(conversation):
    payload = {
        "type": "conversation.created",
        "conversation": {
            "id": conversation.id,
            "reader": {
                "id": conversation.reader_id,
                "display_name": conversation.reader.display_name,
            },
            "creator": {
                "id": conversation.creator_id,
                "user_id": conversation.creator.user_id,
                "display_name": conversation.creator.user.display_name,
            },
            "created_at": conversation.created_at.isoformat(),
            "updated_at": conversation.updated_at.isoformat(),
        },
    }
    participant_ids = _participant_user_ids(conversation)
    transaction.on_commit(
        lambda: publish_user_event(participant_ids, payload)
    )


def schedule_message_created(*, conversation, message):
    payload = {
        "type": "message.created",
        "message": {
            "id": message.id,
            "conversation_id": conversation.id,
            "sender": {
                "id": message.sender_id,
                "display_name": message.sender.display_name,
            },
            "body": message.body,
            "created_at": message.created_at.isoformat(),
            "read_at": (
                message.read_at.isoformat()
                if message.read_at is not None
                else None
            ),
            "is_read": message.read_at is not None,
        },
    }
    participant_ids = _participant_user_ids(conversation)
    transaction.on_commit(
        lambda: publish_user_event(participant_ids, payload)
    )


def schedule_messages_read(
    *,
    conversation,
    viewer,
    marked_count,
    read_at,
):
    if marked_count <= 0:
        return

    payload = {
        "type": "messages.read",
        "conversation_id": conversation.id,
        "read_by_user_id": viewer.id,
        "marked_read": marked_count,
        "read_at": read_at.isoformat(),
    }
    participant_ids = _participant_user_ids(conversation)
    transaction.on_commit(
        lambda: publish_user_event(participant_ids, payload)
    )
