from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ("InsightInk", {"fields": ("display_name", "preferred_ui_language")}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ("InsightInk", {"fields": ("display_name", "preferred_ui_language")}),
    )
