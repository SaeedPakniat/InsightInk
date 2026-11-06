from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.generics import ListAPIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet

from creators.permissions import IsCreator, IsCreatorOwner

from .language_filters import filter_queryset_by_discovery_languages
from .models import ContentLanguage, Idea, Source, Topic
from .pagination import FeedCursorPagination
from .selectors import public_idea_queryset
from .serializers import (
    ContentLanguageSerializer,
    CreatorIdeaSerializer,
    IdeaSerializer,
    SourceSerializer,
    TopicSerializer,
)


class ContentLanguageViewSet(ReadOnlyModelViewSet):
    queryset = ContentLanguage.objects.filter(is_active=True).order_by(
        "display_order",
        "code",
    )
    serializer_class = ContentLanguageSerializer
    permission_classes = [AllowAny]


class TopicViewSet(ReadOnlyModelViewSet):
    queryset = Topic.objects.filter(is_active=True).order_by("id")
    serializer_class = TopicSerializer
    permission_classes = [AllowAny]


class SourceViewSet(ReadOnlyModelViewSet):
    queryset = Source.objects.order_by("id")
    serializer_class = SourceSerializer
    permission_classes = [AllowAny]


class IdeaViewSet(ReadOnlyModelViewSet):
    serializer_class = IdeaSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = public_idea_queryset().order_by("-id")
        if self.action == "retrieve":
            return queryset
        return filter_queryset_by_discovery_languages(queryset, self.request)


class FeedView(ListAPIView):
    serializer_class = IdeaSerializer
    permission_classes = [AllowAny]
    pagination_class = FeedCursorPagination

    def get_queryset(self):
        queryset = public_idea_queryset().order_by("-id")
        return filter_queryset_by_discovery_languages(queryset, self.request)


class CreatorIdeaViewSet(ModelViewSet):
    serializer_class = CreatorIdeaSerializer
    permission_classes = [IsCreator, IsCreatorOwner]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        user = self.request.user
        if not getattr(user, "is_authenticated", False):
            return Idea.objects.none()
        return (
            Idea.objects.filter(creator__user=user)
            .select_related("source")
            .prefetch_related("topics")
            .order_by("-id")
        )

    def perform_create(self, serializer):
        serializer.save(
            creator=self.request.user.creator_profile,
            status=Idea.IdeaStatus.DRAFT,
            published_at=None,
        )

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.status != Idea.IdeaStatus.DRAFT:
            raise ValidationError({"detail": "Only draft ideas can be edited."})
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.status != Idea.IdeaStatus.DRAFT:
            raise ValidationError({"detail": "Only draft ideas can be deleted."})
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
