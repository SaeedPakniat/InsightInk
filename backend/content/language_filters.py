from rest_framework.exceptions import ValidationError

from .models import ContentLanguage


def _deduplicate(codes):
    return list(dict.fromkeys(codes))


def validate_active_language_codes(codes):
    normalized = _deduplicate(
        code.strip()
        for code in codes
        if code is not None and code.strip()
    )
    if not normalized:
        return []

    rows = {
        language.code: language
        for language in ContentLanguage.objects.filter(code__in=normalized)
    }
    unknown = [code for code in normalized if code not in rows]
    inactive = [
        code
        for code in normalized
        if code in rows and not rows[code].is_active
    ]

    errors = []
    if unknown:
        errors.append("Unknown language code(s): " + ", ".join(unknown) + ".")
    if inactive:
        errors.append("Inactive language code(s): " + ", ".join(inactive) + ".")
    if errors:
        raise ValidationError({"languages": errors})

    return normalized


def explicit_language_codes(request, *, allow_legacy_singular=False):
    has_plural = "languages" in request.query_params
    has_singular = allow_legacy_singular and "language" in request.query_params

    if has_plural and has_singular:
        raise ValidationError(
            {"languages": ["Use either 'languages' or legacy 'language', not both."]}
        )

    if has_plural:
        raw = request.query_params.get("languages", "")
        return validate_active_language_codes(raw.split(","))

    if has_singular:
        return validate_active_language_codes(
            [request.query_params.get("language", "")]
        )

    return None


def stored_reader_language_codes(user):
    return (
        user.content_language_preferences.filter(language__is_active=True)
        .order_by("language__display_order", "language__code")
        .values_list("language_id", flat=True)
    )


def active_language_codes():
    return (
        ContentLanguage.objects.filter(is_active=True)
        .order_by("display_order", "code")
        .values_list("code", flat=True)
    )


def discovery_language_codes(request, *, allow_legacy_singular=False):
    explicit = explicit_language_codes(
        request,
        allow_legacy_singular=allow_legacy_singular,
    )
    if explicit is not None:
        return explicit

    if getattr(request.user, "is_authenticated", False):
        return stored_reader_language_codes(request.user)

    return active_language_codes()


def filter_queryset_by_discovery_languages(
    queryset,
    request,
    *,
    allow_legacy_singular=False,
):
    codes = discovery_language_codes(
        request,
        allow_legacy_singular=allow_legacy_singular,
    )
    return queryset.filter(language__in=codes)
