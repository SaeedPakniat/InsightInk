from rest_framework import serializers

from content.models import Source


class SearchQuerySerializer(serializers.Serializer):
    q = serializers.CharField(
        required=False,
        allow_blank=True,
        trim_whitespace=True,
        max_length=200,
    )
    language = serializers.ChoiceField(
        choices=(("fa", "Persian"), ("en", "English")),
        required=False,
    )
    type = serializers.ChoiceField(
        choices=Source.SourceType.choices,
        required=False,
    )
    topic = serializers.SlugField(required=False, max_length=80)
