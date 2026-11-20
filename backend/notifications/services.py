from django.db import transaction
from django.utils import timezone

from .models import Notification


def create_message_received_notification(*, message):
    conversation = message.conversation
    if message.sender_id == conversation.reader_id:
        recipient_id = conversation.creator.user_id
    else:
        recipient_id = conversation.reader_id

    return Notification.objects.create(
        recipient_id=recipient_id,
        type=Notification.Type.MESSAGE_RECEIVED,
        actor=message.sender,
        message=message,
    )


def create_creator_followed_notification(*, follow):
    return Notification.objects.create(
        recipient_id=follow.creator.user_id,
        type=Notification.Type.CREATOR_FOLLOWED,
        actor=follow.user,
        creator=follow.creator,
    )


def create_comment_received_notification(*, comment):
    recipient_id = comment.idea.creator.user_id
    if recipient_id == comment.author_id:
        return None

    return Notification.objects.create(
        recipient_id=recipient_id,
        type=Notification.Type.COMMENT_RECEIVED,
        actor=comment.author,
        comment=comment,
    )


def create_idea_hidden_notification(*, idea):
    return Notification.objects.create(
        recipient_id=idea.creator.user_id,
        type=Notification.Type.IDEA_HIDDEN,
        idea=idea,
    )


def create_idea_restored_notification(*, idea):
    return Notification.objects.create(
        recipient_id=idea.creator.user_id,
        type=Notification.Type.IDEA_RESTORED,
        idea=idea,
    )


@transaction.atomic
def mark_notification_read(*, recipient, notification_id):
    notification = (
        Notification.objects.select_for_update()
        .filter(pk=notification_id, recipient=recipient)
        .first()
    )
    if notification is None:
        return None

    if notification.read_at is None:
        notification.read_at = timezone.now()
        notification.save(update_fields=("read_at",))
    return notification


@transaction.atomic
def mark_all_notifications_read(*, recipient):
    read_at = timezone.now()
    marked_count = Notification.objects.filter(
        recipient=recipient,
        read_at__isnull=True,
    ).update(read_at=read_at)
    return marked_count, read_at
