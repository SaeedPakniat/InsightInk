from django.contrib import admin

from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "recipient",
        "type",
        "actor",
        "created_at",
        "read_at",
    )
    list_filter = ("type", "read_at")
    search_fields = (
        "recipient__email",
        "recipient__display_name",
        "actor__email",
        "actor__display_name",
    )
    readonly_fields = ("created_at",)
