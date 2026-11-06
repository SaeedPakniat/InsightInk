from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from content.models import Idea

from .models import Comment, SavedIdea, Spark
from .selectors import viewer_engagement_state
from .serializers import (
    CommentSerializer,
    ViewerEngagementQuerySerializer,
    ViewerEngagementResponseSerializer,
)


def get_public_idea(idea_id):
    return get_object_or_404(
        Idea,
        pk=idea_id,
        status=Idea.IdeaStatus.PUBLISHED,
    )


class SparkView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, idea_id):
        idea = get_public_idea(idea_id)
        Spark.objects.get_or_create(user=request.user, idea=idea)
        return Response(status=status.HTTP_204_NO_CONTENT)

    def delete(self, request, idea_id):
        idea = get_public_idea(idea_id)
        Spark.objects.filter(user=request.user, idea=idea).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class SaveView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, idea_id):
        idea = get_public_idea(idea_id)
        SavedIdea.objects.get_or_create(user=request.user, idea=idea)
        return Response(status=status.HTTP_204_NO_CONTENT)

    def delete(self, request, idea_id):
        idea = get_public_idea(idea_id)
        SavedIdea.objects.filter(user=request.user, idea=idea).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class IdeaCommentsView(APIView):
    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated()]
        return [AllowAny()]

    def get(self, request, idea_id):
        idea = get_public_idea(idea_id)
        comments = (
            Comment.objects.filter(
                idea=idea,
                status=Comment.CommentStatus.VISIBLE,
            )
            .select_related("author")
            .order_by("id")
        )
        return Response(CommentSerializer(comments, many=True).data)

    def post(self, request, idea_id):
        idea = get_public_idea(idea_id)
        serializer = CommentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        comment = serializer.save(
            author=request.user,
            idea=idea,
            status=Comment.CommentStatus.VISIBLE,
        )
        return Response(
            CommentSerializer(comment).data,
            status=status.HTTP_201_CREATED,
        )


class CommentDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, comment_id):
        comment = get_object_or_404(Comment, pk=comment_id)
        if comment.author_id != request.user.id:
            return Response(
                {"detail": "You do not have permission to delete this comment."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if comment.status != Comment.CommentStatus.DELETED:
            comment.status = Comment.CommentStatus.DELETED
            comment.save()

        return Response(status=status.HTTP_204_NO_CONTENT)


class ViewerEngagementStateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        query_serializer = ViewerEngagementQuerySerializer(
            data=request.query_params
        )
        query_serializer.is_valid(raise_exception=True)
        items = viewer_engagement_state(
            user=request.user,
            idea_ids=query_serializer.validated_data["idea_ids"],
        )
        return Response(
            ViewerEngagementResponseSerializer({"items": items}).data
        )
