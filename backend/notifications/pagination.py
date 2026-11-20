from rest_framework.pagination import CursorPagination


class NotificationCursorPagination(CursorPagination):
    page_size = 30
    ordering = ("-created_at", "-id")
