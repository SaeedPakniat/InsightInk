import re
import unicodedata

from django.db.models import F, Func, TextField, Value
from django.db.models.functions import Replace, Trim


_WHITESPACE_RE = re.compile(r"\s+")
_CHARACTER_TRANSLATION = str.maketrans(
    {
        "ي": "ی",
        "ى": "ی",
        "ك": "ک",
    }
)


def normalize_search_text(value):
    """Normalize user search text without mutating stored source content."""
    normalized = unicodedata.normalize("NFKC", value or "")
    normalized = normalized.translate(_CHARACTER_TRANSLATION)
    normalized = normalized.replace("\u200c", " ")
    normalized = _WHITESPACE_RE.sub(" ", normalized).strip()
    return normalized.casefold()


def normalized_search_expression(field_name):
    """Return a PostgreSQL expression mirroring the supported query normalization."""
    expression = F(field_name)
    for source, target in (("ي", "ی"), ("ى", "ی"), ("ك", "ک"), ("\u200c", " ")):
        expression = Replace(expression, Value(source), Value(target))

    expression = Func(
        expression,
        Value("[[:space:]]+"),
        Value(" "),
        Value("g"),
        function="REGEXP_REPLACE",
        output_field=TextField(),
    )
    return Trim(expression)
