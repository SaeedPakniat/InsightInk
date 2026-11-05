from rest_framework import serializers

from content.serializers import IdeaSerializer


class RecommendationItemSerializer(serializers.Serializer):
    idea = IdeaSerializer(read_only=True)
    score = serializers.FloatField(read_only=True)
    reason = serializers.CharField(read_only=True)


class RelatedIdeaItemSerializer(serializers.Serializer):
    idea = IdeaSerializer(read_only=True)
    score = serializers.FloatField(read_only=True)
    similarity = serializers.FloatField(read_only=True)
    reason = serializers.CharField(read_only=True)
