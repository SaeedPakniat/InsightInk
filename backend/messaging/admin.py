from django.contrib import admin

from .models import Conversation, Message


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ("id", "reader", "creator", "created_at", "updated_at")
    list_select_related = ("reader", "creator", "creator__user")
    search_fields = (
        "reader__email",
        "reader__display_name",
        "creator__user__email",
        "creator__user__display_name",
    )


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ("id", "conversation", "sender", "created_at", "read_at")
    list_select_related = ("conversation", "sender")
    search_fields = ("body", "sender__email", "sender__display_name")
