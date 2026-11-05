from rest_framework.pagination import CursorPagination


class ReportCursorPagination(CursorPagination):
    page_size = 25
    ordering = "-id"
