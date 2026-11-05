from django.contrib.auth.models import Group
from django.core.exceptions import PermissionDenied
from django.db import transaction

from .permissions import MODERATOR_GROUP_NAME, is_admin


@transaction.atomic
def set_moderator(*, actor, target_user, enabled):
    """Assign or remove bounded moderator status as a system administrator."""
    if not is_admin(actor):
        raise PermissionDenied("Only an admin may manage moderator status.")
    if not isinstance(enabled, bool):
        raise TypeError("enabled must be a boolean.")

    moderator_group, _ = Group.objects.get_or_create(name=MODERATOR_GROUP_NAME)

    if enabled:
        target_user.groups.add(moderator_group)
        if not target_user.is_staff:
            target_user.is_staff = True
            target_user.save(update_fields=["is_staff"])
    else:
        target_user.groups.remove(moderator_group)
        # is_staff may represent separate administrative authority. Group removal
        # is sufficient to revoke Moderator and is safe without provenance data.

    return target_user
