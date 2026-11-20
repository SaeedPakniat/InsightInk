from django.db import transaction

from messaging.realtime import publish_user_event


def schedule_notification_created(notification):
    payload = {
        "type": "notification.created",
        "notification_id": notification.id,
        "notification_type": notification.type,
    }
    recipient_id = notification.recipient_id
    transaction.on_commit(
        lambda: publish_user_event((recipient_id,), payload)
    )
