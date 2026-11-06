from django.core.exceptions import ValidationError


def validate_active_content_language(value):
    """Require a code from the active canonical content-language catalog."""
    from .models import ContentLanguage

    if not ContentLanguage.objects.filter(code=value, is_active=True).exists():
        raise ValidationError(
            f'"{value}" is not an active supported content language.',
            code="unsupported_content_language",
        )
