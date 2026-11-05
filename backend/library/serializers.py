from rest_framework import serializers

from content.serializers import IdeaSerializer
from engagement.models import SavedIdea


class SavedLibraryItemSerializer(serializers.ModelSerializer):
    idea = IdeaSerializer(read_only=True)

    class Meta:
        model = SavedIdea
        fields = ("saved_at", "idea")
        read_only_fields = fields
