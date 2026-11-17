from rest_framework.pagination import CursorPagination


class ConversationCursorPagination(CursorPagination):
    page_size = 20
    ordering = ("-updated_at", "-id")


class MessageCursorPagination(CursorPagination):
    page_size = 50
    ordering = "-id"
