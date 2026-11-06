from django.db.models.signals import post_save
from django.dispatch import receiver

from content.language_catalog import DEFAULT_CONTENT_LANGUAGE_CODES
from content.models import ContentLanguage

from .models import User, UserContentLanguage


@receiver(post_save, sender=User)
def add_default_content_languages(sender, instance, created, **kwargs):
    if not created:
        return

    languages = ContentLanguage.objects.filter(
        code__in=DEFAULT_CONTENT_LANGUAGE_CODES,
        is_active=True,
    )
    UserContentLanguage.objects.bulk_create(
        [
            UserContentLanguage(user=instance, language=language)
            for language in languages
        ],
        ignore_conflicts=True,
    )
