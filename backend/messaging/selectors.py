from django.db.models import Count, OuterRef, Q, Subquery

from .models import Conversation, Message


def conversations_for_user(user):
    latest_message = Message.objects.filter(
        conversation_id=OuterRef("pk")
    ).order_by("-id")

    return (
        Conversation.objects.filter(
            Q(reader=user) | Q(creator__user=user)
        )
        .select_related("reader", "creator", "creator__user")
        .annotate(
            unread_count=Count(
                "messages",
                filter=Q(
                    messages__read_at__isnull=True,
                )
                & ~Q(messages__sender=user),
            ),
            last_message_id=Subquery(
                latest_message.values("id")[:1]
            ),
            last_message_sender_id=Subquery(
                latest_message.values("sender_id")[:1]
            ),
            last_message_body=Subquery(
                latest_message.values("body")[:1]
            ),
            last_message_created_at=Subquery(
                latest_message.values("created_at")[:1]
            ),
            last_message_read_at=Subquery(
                latest_message.values("read_at")[:1]
            ),
        )
        .order_by("-updated_at", "-id")
    )


def conversation_for_user(*, conversation_id, user):
    return (
        Conversation.objects.filter(
            Q(reader=user) | Q(creator__user=user),
            pk=conversation_id,
        )
        .select_related("reader", "creator", "creator__user")
        .first()
    )


def reportable_message_for_user(*, message_id, user):
    return (
        Message.objects.filter(
            Q(conversation__reader=user)
            | Q(conversation__creator__user=user),
            pk=message_id,
        )
        .exclude(sender=user)
        .select_related(
            "sender",
            "conversation",
            "conversation__reader",
            "conversation__creator",
            "conversation__creator__user",
        )
        .first()
    )
