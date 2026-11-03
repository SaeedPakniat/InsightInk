from rest_framework.permissions import AllowAny
from rest_framework.viewsets import ReadOnlyModelViewSet

from .models import Source, Topic
from .serializers import SourceSerializer, TopicSerializer


class TopicViewSet(ReadOnlyModelViewSet):
    queryset = Topic.objects.filter(is_active=True).order_by("id")
    serializer_class = TopicSerializer
    permission_classes = [AllowAny]


class SourceViewSet(ReadOnlyModelViewSet):
    queryset = Source.objects.order_by("id")
    serializer_class = SourceSerializer
    permission_classes = [AllowAny]
