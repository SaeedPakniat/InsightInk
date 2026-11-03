from django.db.models import Prefetch
from rest_framework.permissions import AllowAny
from rest_framework.viewsets import ReadOnlyModelViewSet

from .models import Idea, Source, Topic
from .serializers import IdeaSerializer, SourceSerializer, TopicSerializer


class TopicViewSet(ReadOnlyModelViewSet):
    queryset = Topic.objects.filter(is_active=True).order_by("id")
    serializer_class = TopicSerializer
    permission_classes = [AllowAny]


class SourceViewSet(ReadOnlyModelViewSet):
    queryset = Source.objects.order_by("id")
    serializer_class = SourceSerializer
    permission_classes = [AllowAny]


class IdeaViewSet(ReadOnlyModelViewSet):
    queryset = (
        Idea.objects.filter(status=Idea.IdeaStatus.PUBLISHED)
        .select_related("creator", "creator__user", "source")
        .prefetch_related(
            Prefetch(
                "topics",
                queryset=Topic.objects.filter(is_active=True).order_by("id"),
                to_attr="active_topics",
            )
        )
        .order_by("-id")
    )
    serializer_class = IdeaSerializer
    permission_classes = [AllowAny]
