from rest_framework import serializers

from .models import Source, Topic


class TopicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Topic
        fields = ("id", "slug", "name_fa", "name_en")


class SourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Source
        fields = (
            "id",
            "type",
            "title",
            "original_creator_text",
            "language",
            "external_url",
            "cover",
        )
