from rest_framework.pagination import CursorPagination


class ReportCursorPagination(CursorPagination):
    page_size = 25
    ordering = "-id"


class HiddenIdeaCursorPagination(CursorPagination):
    page_size = 25
    ordering = ("-updated_at", "-id")
