from django.contrib.auth import authenticate
from django.contrib.auth import login as django_login
from django.contrib.auth import logout as django_logout
from django.db import transaction
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import UserContentLanguage, UserInterest
from .serializers import (
    ContentLanguageSelectionSerializer,
    CurrentContentLanguagesSerializer,
    CurrentInterestsSerializer,
    CurrentUserSerializer,
    InterestSelectionSerializer,
    LoginSerializer,
    RegisterSerializer,
)


@method_decorator(csrf_protect, name="dispatch")
class CsrfProtectedAPIView(APIView):
    """Keep Django's CsrfViewMiddleware active for this DRF view."""


class CsrfTokenView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"csrfToken": get_token(request)})


class RegisterView(CsrfProtectedAPIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        django_login(request, user)
        return Response(
            CurrentUserSerializer(user).data,
            status=status.HTTP_201_CREATED,
        )


class LoginView(CsrfProtectedAPIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = authenticate(
            request=request,
            email=serializer.validated_data["email"],
            password=serializer.validated_data["password"],
        )
        if user is None:
            return Response(
                {"detail": "Invalid email or password."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        django_login(request, user)
        return Response(CurrentUserSerializer(user).data)


class LogoutView(CsrfProtectedAPIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        django_logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(CurrentUserSerializer(request.user).data)


class UserInterestsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        topics = [
            interest.topic
            for interest in request.user.interests.select_related("topic")
            .filter(topic__is_active=True)
            .order_by("topic__id")
        ]
        return Response(CurrentInterestsSerializer({"topics": topics}).data)

    @transaction.atomic
    def put(self, request):
        serializer = InterestSelectionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        topics = serializer.validated_data["topics"]

        UserInterest.objects.filter(user=request.user).delete()
        UserInterest.objects.bulk_create(
            [
                UserInterest(user=request.user, topic=topic)
                for topic in topics
            ]
        )

        return Response(
            CurrentInterestsSerializer({"topics": topics}).data,
        )


class UserContentLanguagesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        languages = [
            preference.language
            for preference in request.user.content_language_preferences
            .select_related("language")
            .filter(language__is_active=True)
            .order_by("language__display_order", "language__code")
        ]
        return Response(CurrentContentLanguagesSerializer({"languages": languages}).data)

    @transaction.atomic
    def put(self, request):
        serializer = ContentLanguageSelectionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        languages = serializer.validated_data["languages"]

        UserContentLanguage.objects.filter(user=request.user).delete()
        UserContentLanguage.objects.bulk_create(
            [
                UserContentLanguage(user=request.user, language=language)
                for language in languages
            ]
        )

        ordered_languages = sorted(
            languages,
            key=lambda language: (language.display_order, language.code),
        )
        return Response(
            CurrentContentLanguagesSerializer(
                {"languages": ordered_languages}
            ).data
        )
