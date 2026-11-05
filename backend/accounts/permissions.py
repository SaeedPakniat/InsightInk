from rest_framework.permissions import BasePermission


MODERATOR_GROUP_NAME = "Moderator"


def is_moderator(user):
    """Return whether a user has the complete bounded moderator capability."""
    return bool(
        getattr(user, "is_authenticated", False)
        and getattr(user, "is_staff", False)
        and user.groups.filter(name=MODERATOR_GROUP_NAME).exists()
    )


def is_admin(user):
    """Return whether a user has Django's system-administrator authority."""
    return bool(
        getattr(user, "is_authenticated", False)
        and getattr(user, "is_superuser", False)
    )


class IsModerator(BasePermission):
    """Allow users with staff capability and explicit Moderator membership."""

    def has_permission(self, request, view):
        return is_moderator(request.user)


class IsAdmin(BasePermission):
    """Allow Django superusers only."""

    def has_permission(self, request, view):
        return is_admin(request.user)
