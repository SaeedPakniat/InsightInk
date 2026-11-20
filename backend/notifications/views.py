from django.http import Http404
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .pagination import NotificationCursorPagination
from .selectors import notifications_for_user, unread_count_for_user
from .serializers import (
    NotificationReadAllResultSerializer,
    NotificationSerializer,
    NotificationUnreadCountSerializer,
)
from .services import mark_all_notifications_read, mark_notification_read


class NotificationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        queryset = notifications_for_user(request.user)
        paginator = NotificationCursorPagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        serializer = NotificationSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class NotificationUnreadCountView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        payload = {"unread_count": unread_count_for_user(request.user)}
        return Response(NotificationUnreadCountSerializer(payload).data)


class NotificationReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, notification_id):
        notification = mark_notification_read(
            recipient=request.user,
            notification_id=notification_id,
        )
        if notification is None:
            raise Http404
        return Response(NotificationSerializer(notification).data)


class NotificationReadAllView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        marked_count, read_at = mark_all_notifications_read(
            recipient=request.user
        )
        payload = {"marked_read": marked_count, "read_at": read_at}
        return Response(NotificationReadAllResultSerializer(payload).data)
