from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import CreatorProfile
from .serializers import CreatorProfileSelfSerializer


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
