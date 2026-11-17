from django.db import transaction
from django.utils import timezone

from .models import Conversation, Message
from .realtime import (
    schedule_conversation_created,
    schedule_message_created,
    schedule_messages_read,
)


class MessagingDomainError(ValueError):
    pass


@transaction.atomic
def start_conversation(*, reader, creator):
    if reader.id == creator.user_id:
        raise MessagingDomainError(
            "You cannot start a conversation with your own creator profile."
        )

    conversation, created = Conversation.objects.get_or_create(
        reader=reader,
        creator=creator,
    )
    if created:
        schedule_conversation_created(conversation)
    return conversation, created


@transaction.atomic
def send_message(*, conversation, sender, body):
    if not conversation.is_participant(sender):
        raise MessagingDomainError(
            "Only conversation participants can send messages."
        )

    message = Message.objects.create(
        conversation=conversation,
        sender=sender,
        body=body,
    )
    Conversation.objects.filter(pk=conversation.pk).update(
        updated_at=message.created_at
    )
    conversation.updated_at = message.created_at
    schedule_message_created(
        conversation=conversation,
        message=message,
    )
    return message


@transaction.atomic
def mark_conversation_read(*, conversation, viewer):
    if not conversation.is_participant(viewer):
        raise MessagingDomainError(
            "Only conversation participants can mark messages as read."
        )

    read_at = timezone.now()
    marked_count = (
        Message.objects.filter(
            conversation=conversation,
            read_at__isnull=True,
        )
        .exclude(sender=viewer)
        .update(read_at=read_at)
    )
    schedule_messages_read(
        conversation=conversation,
        viewer=viewer,
        marked_count=marked_count,
        read_at=read_at,
    )
    return marked_count, read_at
