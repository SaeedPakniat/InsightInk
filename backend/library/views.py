from django.db.models import Prefetch
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated

from content.models import Idea, Topic
from engagement.models import SavedIdea

from .serializers import SavedLibraryItemSerializer


class SavedLibraryView(ListAPIView):
    serializer_class = SavedLibraryItemSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return (
            SavedIdea.objects.filter(
                user=self.request.user,
                idea__status=Idea.IdeaStatus.PUBLISHED,
            )
            .select_related(
                "idea",
                "idea__creator",
                "idea__creator__user",
                "idea__source",
            )
            .prefetch_related(
                Prefetch(
                    "idea__topics",
                    queryset=Topic.objects.filter(is_active=True).order_by("id"),
                    to_attr="active_topics",
                )
            )
            .order_by("-saved_at", "-id")
        )
