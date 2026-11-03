from django.contrib.admin.sites import AdminSite
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AbstractUser
from django.core.exceptions import FieldDoesNotExist
from django.db import IntegrityError, transaction
from django.test import SimpleTestCase, TestCase

from .admin import CustomUserAdmin
from .forms import CustomUserChangeForm, CustomUserCreationForm
from .models import User


class CustomUserConfigurationTests(SimpleTestCase):
    def test_auth_user_model_resolves_to_accounts_user(self):
        self.assertEqual(settings.AUTH_USER_MODEL, "accounts.User")
        self.assertIs(get_user_model(), User)
        self.assertTrue(issubclass(User, AbstractUser))

    def test_email_is_the_only_username_field(self):
        self.assertEqual(User.USERNAME_FIELD, "email")
        self.assertEqual(User.REQUIRED_FIELDS, [])
        with self.assertRaises(FieldDoesNotExist):
            User._meta.get_field("username")

    def test_email_model_field_is_required_and_unique(self):
        email_field = User._meta.get_field("email")

        self.assertFalse(email_field.blank)
        self.assertTrue(email_field.unique)


class UserManagerTests(TestCase):
    def test_create_user_uses_email_and_hashes_password(self):
        user = User.objects.create_user(
            email="reader@example.com",
            password="test-password",
        )

        self.assertEqual(user.email, "reader@example.com")
        self.assertNotEqual(user.password, "test-password")
        self.assertTrue(user.check_password("test-password"))
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)

    def test_create_user_requires_email(self):
        with self.assertRaisesMessage(ValueError, "email address must be provided"):
            User.objects.create_user(email="", password="test-password")

    def test_email_is_unique(self):
        User.objects.create_user(email="reader@example.com")

        with self.assertRaises(IntegrityError), transaction.atomic():
            User.objects.create_user(email="reader@example.com")

    def test_create_user_normalizes_email_domain(self):
        user = User.objects.create_user(email="Reader@EXAMPLE.COM")

        self.assertEqual(user.email, "Reader@example.com")

    def test_create_superuser_sets_required_flags(self):
        user = User.objects.create_superuser(
            email="admin@example.com",
            password="test-password",
        )

        self.assertTrue(user.is_staff)
        self.assertTrue(user.is_superuser)
        self.assertTrue(user.check_password("test-password"))

    def test_create_superuser_rejects_is_staff_false(self):
        with self.assertRaisesMessage(ValueError, "is_staff=True"):
            User.objects.create_superuser(
                email="admin@example.com",
                password="test-password",
                is_staff=False,
            )

    def test_create_superuser_rejects_is_superuser_false(self):
        with self.assertRaisesMessage(ValueError, "is_superuser=True"):
            User.objects.create_superuser(
                email="admin@example.com",
                password="test-password",
                is_superuser=False,
            )

    def test_project_specific_fields_remain_functional(self):
        user = User.objects.create_user(
            email="reader@example.com",
            display_name="Reader",
            preferred_ui_language=User.Language.ENGLISH,
        )

        self.assertEqual(user.display_name, "Reader")
        self.assertEqual(user.preferred_ui_language, "en")


class CustomUserAdminTests(SimpleTestCase):
    def setUp(self):
        self.user_admin = CustomUserAdmin(User, AdminSite())

    def test_admin_configuration_never_references_username(self):
        configured_fields = {
            field
            for _, options in self.user_admin.fieldsets
            for field in options["fields"]
        }
        add_fields = {
            field
            for _, options in self.user_admin.add_fieldsets
            for field in options["fields"]
        }

        self.assertNotIn("username", configured_fields)
        self.assertNotIn("username", add_fields)
        self.assertNotIn("username", self.user_admin.list_display)
        self.assertNotIn("username", self.user_admin.search_fields)
        self.assertNotIn("username", self.user_admin.ordering)
        self.assertIn("email", configured_fields)
        self.assertIn("email", add_fields)

    def test_admin_forms_target_custom_user(self):
        self.assertIs(CustomUserCreationForm._meta.model, User)
        self.assertIs(CustomUserChangeForm._meta.model, User)
        self.assertIn("email", CustomUserCreationForm.base_fields)
        self.assertIn("email", CustomUserChangeForm.base_fields)
        self.assertNotIn("username", CustomUserCreationForm.base_fields)
        self.assertNotIn("username", CustomUserChangeForm.base_fields)
