from .models import Notification


def notifications_for_user(user):
    return (
        Notification.objects.filter(recipient=user)
        .select_related(
            "actor",
            "message",
            "creator",
            "creator__user",
            "comment",
            "idea",
        )
        .order_by("-created_at", "-id")
    )


def unread_count_for_user(user):
    return Notification.objects.filter(
        recipient=user,
        read_at__isnull=True,
    ).count()
