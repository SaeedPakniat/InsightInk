from rest_framework.pagination import CursorPagination


class FeedCursorPagination(CursorPagination):
    page_size = 10
    ordering = "-id"
