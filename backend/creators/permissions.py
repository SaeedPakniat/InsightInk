from rest_framework.permissions import BasePermission

from .models import CreatorProfile


def is_creator(user):
    """Return whether an authenticated user has a CreatorProfile."""
    return bool(
        getattr(user, "is_authenticated", False)
        and getattr(user, "pk", None)
        and CreatorProfile.objects.filter(user_id=user.pk).exists()
    )


class IsCreator(BasePermission):
    """Allow authenticated users whose creator capability exists."""

    def has_permission(self, request, view):
        return is_creator(request.user)


class IsCreatorOwner(BasePermission):
    """Allow creator operations only on resources owned by that creator."""

    def has_permission(self, request, view):
        return is_creator(request.user)

    def has_object_permission(self, request, view, obj):
        creator = getattr(obj, "creator", None)
        return bool(
            is_creator(request.user)
            and getattr(creator, "user_id", None) == request.user.pk
        )
