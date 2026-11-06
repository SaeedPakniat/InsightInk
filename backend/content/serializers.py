from django.db import transaction
from rest_framework import serializers

from creators.serializers import CreatorSummarySerializer

from .language_filters import validate_active_language_codes
from .models import ContentLanguage, Idea, Source, Topic


class ContentLanguageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContentLanguage
        fields = ("code", "name_en", "name_fa", "native_name")
        read_only_fields = fields


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


class CreatorIdeaSerializer(serializers.ModelSerializer):
    source = serializers.PrimaryKeyRelatedField(queryset=Source.objects.all())
    topics = serializers.PrimaryKeyRelatedField(
        queryset=Topic.objects.filter(is_active=True),
        many=True,
        required=False,
    )

    class Meta:
        model = Idea
        fields = (
            "id",
            "language",
            "title",
            "body",
            "estimated_read_seconds",
            "status",
            "published_at",
            "created_at",
            "updated_at",
            "source",
            "topics",
        )
        read_only_fields = (
            "id",
            "status",
            "published_at",
            "created_at",
            "updated_at",
        )
        extra_kwargs = {
            "estimated_read_seconds": {"min_value": 1},
        }

    def validate_language(self, value):
        return validate_active_language_codes([value])[0]

    @transaction.atomic
    def create(self, validated_data):
        topics = validated_data.pop("topics", [])
        idea = Idea.objects.create(**validated_data)
        idea.topics.set(topics)
        return idea

    @transaction.atomic
    def update(self, instance, validated_data):
        topics = validated_data.pop("topics", None)
        for attribute, value in validated_data.items():
            setattr(instance, attribute, value)
        instance.save()
        if topics is not None:
            instance.topics.set(topics)
        return instance
