from rest_framework.permissions import BasePermission

from accounts.permissions import is_admin, is_moderator


class IsModeratorOrAdmin(BasePermission):
    """Allow bounded Moderators and Django superusers."""

    def has_permission(self, request, view):
        return is_moderator(request.user) or is_admin(request.user)
