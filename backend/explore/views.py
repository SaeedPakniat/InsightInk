from django.http import Http404
from rest_framework.generics import ListAPIView
from rest_framework.permissions import AllowAny

from content.pagination import FeedCursorPagination
from content.serializers import IdeaSerializer

from .selectors import published_ideas_for_active_topic, search_public_ideas
from .serializers import SearchQuerySerializer


class SearchView(ListAPIView):
    serializer_class = IdeaSerializer
    permission_classes = [AllowAny]
    pagination_class = FeedCursorPagination

    def get_queryset(self):
        query_serializer = SearchQuerySerializer(data=self.request.query_params)
        query_serializer.is_valid(raise_exception=True)
        params = query_serializer.validated_data

        return search_public_ideas(
            query=params.get("q", ""),
            language=params.get("language"),
            source_type=params.get("type"),
            topic_slug=params.get("topic"),
        )


class TopicIdeasView(ListAPIView):
    serializer_class = IdeaSerializer
    permission_classes = [AllowAny]
    pagination_class = FeedCursorPagination

    def get_queryset(self):
        topic, queryset = published_ideas_for_active_topic(self.kwargs["slug"])
        if topic is None:
            raise Http404
        return queryset
