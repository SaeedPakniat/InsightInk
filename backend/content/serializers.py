from rest_framework import serializers

from creators.serializers import CreatorSummarySerializer

from .models import Idea, Source, Topic


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


class IdeaSerializer(serializers.ModelSerializer):
    creator = CreatorSummarySerializer(read_only=True)
    source = SourceSerializer(read_only=True)
    topics = TopicSerializer(source="active_topics", many=True, read_only=True)

    class Meta:
        model = Idea
        fields = (
            "id",
            "language",
            "title",
            "body",
            "estimated_read_seconds",
            "published_at",
            "creator",
            "source",
            "topics",
        )
        read_only_fields = fields
