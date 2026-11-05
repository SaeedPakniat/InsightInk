from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from content.pagination import FeedCursorPagination
from content.selectors import public_idea_queryset
from content.serializers import IdeaSerializer

from .models import CreatorFollow, CreatorProfile
from .selectors import public_creator_queryset
from .serializers import CreatorProfileSelfSerializer, CreatorPublicSerializer


class CreatorProfileSelfView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = get_object_or_404(CreatorProfile, user=request.user)
        return Response(CreatorProfileSelfSerializer(profile).data)

    def post(self, request):
        if CreatorProfile.objects.filter(user=request.user).exists():
            return Response(
                {"detail": "Creator profile already exists."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = CreatorProfileSelfSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        profile = serializer.save(user=request.user)
        return Response(
            CreatorProfileSelfSerializer(profile).data,
            status=status.HTTP_201_CREATED,
        )

    def patch(self, request):
        profile = get_object_or_404(CreatorProfile, user=request.user)
        serializer = CreatorProfileSelfSerializer(
            profile,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class CreatorListView(ListAPIView):
    queryset = public_creator_queryset()
    serializer_class = CreatorPublicSerializer
    permission_classes = [AllowAny]
    pagination_class = None


class CreatorDetailView(RetrieveAPIView):
    queryset = public_creator_queryset()
    serializer_class = CreatorPublicSerializer
    permission_classes = [AllowAny]


class CreatorIdeasView(ListAPIView):
    serializer_class = IdeaSerializer
    permission_classes = [AllowAny]
    pagination_class = FeedCursorPagination

    def get_queryset(self):
        get_object_or_404(CreatorProfile, pk=self.kwargs["creator_id"])
        return public_idea_queryset().filter(
            creator_id=self.kwargs["creator_id"]
        ).order_by("-id")


class CreatorFollowView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, creator_id):
        creator = get_object_or_404(CreatorProfile, pk=creator_id)
        if creator.user_id == request.user.id:
            return Response(
                {"detail": "You cannot follow your own creator profile."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        CreatorFollow.objects.get_or_create(
            user=request.user,
            creator=creator,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)

    def delete(self, request, creator_id):
        creator = get_object_or_404(CreatorProfile, pk=creator_id)
        CreatorFollow.objects.filter(
            user=request.user,
            creator=creator,
        ).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
