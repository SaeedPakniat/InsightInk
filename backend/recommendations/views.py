from django.shortcuts import get_object_or_404
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from content.selectors import public_idea_queryset

from .serializers import RecommendationItemSerializer, RelatedIdeaItemSerializer
from .services import recommendations_for_user, related_ideas_for


class RecommendationView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        results = recommendations_for_user(request.user)
        return Response(RecommendationItemSerializer(results, many=True).data)


class RelatedIdeasView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, idea_id):
        idea = get_object_or_404(public_idea_queryset(), pk=idea_id)
        results = related_ideas_for(idea)
        return Response(RelatedIdeaItemSerializer(results, many=True).data)
