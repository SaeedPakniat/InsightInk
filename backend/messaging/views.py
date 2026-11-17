from django.http import Http404
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Message
from .pagination import ConversationCursorPagination, MessageCursorPagination
from .selectors import conversation_for_user, conversations_for_user
from .serializers import (
    ConversationReadResultSerializer,
    ConversationSerializer,
    ConversationStartSerializer,
    MessageCreateSerializer,
    MessageSerializer,
)
from .services import (
    MessagingDomainError,
    mark_conversation_read,
    send_message,
    start_conversation,
)


def participant_conversation_or_404(*, conversation_id, user):
    conversation = conversation_for_user(
        conversation_id=conversation_id,
        user=user,
    )
    if conversation is None:
        raise Http404
    return conversation


class ConversationListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        queryset = conversations_for_user(request.user)
        paginator = ConversationCursorPagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        serializer = ConversationSerializer(
            page,
            many=True,
            context={"request": request},
        )
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        input_serializer = ConversationStartSerializer(
            data=request.data,
            context={"request": request},
        )
        input_serializer.is_valid(raise_exception=True)

        try:
            conversation, created = start_conversation(
                reader=request.user,
                creator=input_serializer.validated_data["creator"],
            )
        except MessagingDomainError as exc:
            raise ValidationError({"detail": str(exc)}) from exc

        conversation = get_object_or_404(
            conversations_for_user(request.user),
            pk=conversation.pk,
        )
        return Response(
            ConversationSerializer(
                conversation,
                context={"request": request},
            ).data,
            status=(
                status.HTTP_201_CREATED
                if created
                else status.HTTP_200_OK
            ),
        )


class ConversationMessagesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, conversation_id):
        conversation = participant_conversation_or_404(
            conversation_id=conversation_id,
            user=request.user,
        )
        queryset = (
            Message.objects.filter(conversation=conversation)
            .select_related("sender")
            .order_by("-id")
        )
        paginator = MessageCursorPagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        serializer = MessageSerializer(
            page,
            many=True,
            context={"request": request},
        )
        return paginator.get_paginated_response(serializer.data)

    def post(self, request, conversation_id):
        conversation = participant_conversation_or_404(
            conversation_id=conversation_id,
            user=request.user,
        )
        input_serializer = MessageCreateSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)

        try:
            message = send_message(
                conversation=conversation,
                sender=request.user,
                body=input_serializer.validated_data["body"],
            )
        except MessagingDomainError as exc:
            raise ValidationError({"detail": str(exc)}) from exc

        return Response(
            MessageSerializer(
                message,
                context={"request": request},
            ).data,
            status=status.HTTP_201_CREATED,
        )


class ConversationReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, conversation_id):
        conversation = participant_conversation_or_404(
            conversation_id=conversation_id,
            user=request.user,
        )

        try:
            marked_count, read_at = mark_conversation_read(
                conversation=conversation,
                viewer=request.user,
            )
        except MessagingDomainError as exc:
            raise ValidationError({"detail": str(exc)}) from exc

        payload = {
            "marked_read": marked_count,
            "unread_count": 0,
            "read_at": read_at,
        }
        return Response(ConversationReadResultSerializer(payload).data)
