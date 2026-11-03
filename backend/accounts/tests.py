from django.contrib.admin.sites import AdminSite
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AbstractUser
from django.contrib.sessions.models import Session
from django.core.exceptions import FieldDoesNotExist
from django.db import IntegrityError, transaction
from django.test import SimpleTestCase, TestCase
from django.urls import reverse
from rest_framework.authentication import SessionAuthentication
from rest_framework.settings import api_settings
from rest_framework.test import APIClient

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


class SessionAuthenticationConfigurationTests(SimpleTestCase):
    def test_session_authentication_is_the_global_drf_authentication_mechanism(self):
        configured_classes = settings.REST_FRAMEWORK[
            "DEFAULT_AUTHENTICATION_CLASSES"
        ]

        self.assertEqual(
            configured_classes,
            ["rest_framework.authentication.SessionAuthentication"],
        )
        self.assertEqual(
            api_settings.DEFAULT_AUTHENTICATION_CLASSES,
            [SessionAuthentication],
        )

    def test_session_cookie_is_http_only_without_forcing_secure_local_cookies(self):
        self.assertTrue(settings.SESSION_COOKIE_HTTPONLY)
        self.assertFalse(settings.SESSION_COOKIE_SECURE)


class SessionAuthenticationAPITestCase(TestCase):
    password = "Correct-Horse-Battery-Staple-2026!"

    def setUp(self):
        self.client = APIClient(enforce_csrf_checks=True)
        self.csrf_url = reverse("api:accounts:csrf")
        self.register_url = reverse("api:accounts:register")
        self.login_url = reverse("api:accounts:login")
        self.logout_url = reverse("api:accounts:logout")
        self.me_url = reverse("api:accounts:me")

    def bootstrap_csrf(self, client=None):
        client = client or self.client
        response = client.get(self.csrf_url)
        self.assertEqual(response.status_code, 200)
        self.assertIn(settings.CSRF_COOKIE_NAME, client.cookies)
        return response.json()["csrfToken"]

    def post_with_csrf(self, url, data=None, client=None):
        client = client or self.client
        token = self.bootstrap_csrf(client)
        return client.post(
            url,
            data=data or {},
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )

    def create_user(self, **overrides):
        values = {
            "email": "reader@example.com",
            "password": self.password,
            "display_name": "Reader",
            "preferred_ui_language": User.Language.ENGLISH,
        }
        values.update(overrides)
        return User.objects.create_user(**values)


class CsrfBootstrapTests(SessionAuthenticationAPITestCase):
    def test_bootstrap_returns_only_a_csrf_token_and_sets_the_cookie(self):
        response = self.client.get(self.csrf_url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(set(response.json()), {"csrfToken"})
        self.assertTrue(response.json()["csrfToken"])
        self.assertIn(settings.CSRF_COOKIE_NAME, self.client.cookies)

    def test_bootstrap_token_is_usable_for_anonymous_unsafe_requests(self):
        response = self.post_with_csrf(
            self.register_url,
            {"email": "new-reader@example.com", "password": self.password},
        )

        self.assertEqual(response.status_code, 201)


class RegistrationAPITests(SessionAuthenticationAPITestCase):
    def test_registration_without_csrf_is_rejected(self):
        response = self.client.post(
            self.register_url,
            data={"email": "new-reader@example.com", "password": self.password},
            format="json",
        )

        self.assertEqual(response.status_code, 403)
        self.assertFalse(User.objects.exists())

    def test_registration_creates_hashed_email_user_and_authenticates_session(self):
        response = self.post_with_csrf(
            self.register_url,
            {
                "email": "new-reader@EXAMPLE.COM",
                "password": self.password,
                "display_name": "New Reader",
                "preferred_ui_language": "en",
            },
        )

        self.assertEqual(response.status_code, 201)
        user = User.objects.get(email="new-reader@example.com")
        self.assertNotEqual(user.password, self.password)
        self.assertTrue(user.check_password(self.password))
        with self.assertRaises(FieldDoesNotExist):
            User._meta.get_field("username")
        self.assertEqual(
            response.json(),
            {
                "id": user.id,
                "email": "new-reader@example.com",
                "display_name": "New Reader",
                "preferred_ui_language": "en",
            },
        )
        self.assertEqual(self.client.get(self.me_url).status_code, 200)

    def test_registration_uses_existing_profile_defaults(self):
        response = self.post_with_csrf(
            self.register_url,
            {"email": "defaults@example.com", "password": self.password},
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["display_name"], "")
        self.assertEqual(response.json()["preferred_ui_language"], "fa")

    def test_duplicate_email_returns_normal_validation_error(self):
        self.create_user()

        response = self.post_with_csrf(
            self.register_url,
            {"email": "reader@example.com", "password": self.password},
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(User.objects.count(), 1)
        self.assertEqual(set(response.json()), {"email"})

    def test_weak_password_is_rejected_by_django_password_validators(self):
        response = self.post_with_csrf(
            self.register_url,
            {"email": "new-reader@example.com", "password": "123"},
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(set(response.json()), {"password"})
        self.assertFalse(User.objects.exists())

    def test_registration_response_never_contains_password_or_auth_metadata(self):
        response = self.post_with_csrf(
            self.register_url,
            {"email": "safe@example.com", "password": self.password},
        )

        self.assertEqual(
            set(response.json()),
            {"id", "email", "display_name", "preferred_ui_language"},
        )


class LoginAPITests(SessionAuthenticationAPITestCase):
    def setUp(self):
        super().setUp()
        self.user = self.create_user()

    def login(self, password=None, email=None, client=None):
        return self.post_with_csrf(
            self.login_url,
            {
                "email": email or self.user.email,
                "password": password or self.password,
            },
            client=client,
        )

    def test_login_without_csrf_is_rejected(self):
        response = self.client.post(
            self.login_url,
            data={"email": self.user.email, "password": self.password},
            format="json",
        )

        self.assertEqual(response.status_code, 403)

    def test_valid_login_establishes_session_and_returns_safe_user(self):
        response = self.login(email="reader@EXAMPLE.COM")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            set(response.json()),
            {"id", "email", "display_name", "preferred_ui_language"},
        )
        self.assertNotIn("password", response.json())
        self.assertEqual(self.client.get(self.me_url).status_code, 200)

    def test_wrong_password_and_nonexistent_email_share_generic_behavior(self):
        token = self.bootstrap_csrf()
        wrong_password = self.client.post(
            self.login_url,
            data={"email": self.user.email, "password": "Wrong-Password-2026!"},
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )
        nonexistent = self.client.post(
            self.login_url,
            data={
                "email": "missing@example.com",
                "password": "Wrong-Password-2026!",
            },
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )

        self.assertEqual(wrong_password.status_code, 400)
        self.assertEqual(nonexistent.status_code, 400)
        self.assertEqual(wrong_password.json(), nonexistent.json())

    def test_login_rotates_an_existing_anonymous_session_identifier(self):
        session = self.client.session
        session["pre_auth_marker"] = True
        session.save()
        old_session_key = self.client.cookies[settings.SESSION_COOKIE_NAME].value

        response = self.login()

        self.assertEqual(response.status_code, 200)
        self.assertNotEqual(
            self.client.cookies[settings.SESSION_COOKIE_NAME].value,
            old_session_key,
        )


class CurrentUserAPITests(SessionAuthenticationAPITestCase):
    def test_anonymous_request_is_rejected(self):
        response = self.client.get(self.me_url)

        self.assertEqual(response.status_code, 403)

    def test_authenticated_request_returns_exact_safe_fields(self):
        user = self.create_user(is_staff=True, is_superuser=True)
        self.client.force_login(user)

        response = self.client.get(self.me_url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "id": user.id,
                "email": user.email,
                "display_name": user.display_name,
                "preferred_ui_language": user.preferred_ui_language,
            },
        )
        for sensitive_field in (
            "password",
            "is_staff",
            "is_superuser",
            "groups",
            "user_permissions",
            "last_login",
        ):
            self.assertNotIn(sensitive_field, response.json())


class LogoutAPITests(SessionAuthenticationAPITestCase):
    def setUp(self):
        super().setUp()
        self.user = self.create_user()

    def test_authenticated_logout_without_csrf_is_rejected(self):
        self.client.force_login(self.user)

        response = self.client.post(self.logout_url, format="json")

        self.assertEqual(response.status_code, 403)
        self.assertEqual(self.client.get(self.me_url).status_code, 200)

    def test_valid_logout_returns_204_and_invalidates_session(self):
        self.client.force_login(self.user)
        old_session_key = self.client.cookies[settings.SESSION_COOKIE_NAME].value

        response = self.post_with_csrf(self.logout_url)

        self.assertEqual(response.status_code, 204)
        self.assertEqual(
            self.client.cookies[settings.SESSION_COOKIE_NAME].value,
            "",
        )
        self.assertFalse(Session.objects.filter(session_key=old_session_key).exists())
        self.assertEqual(self.client.get(self.me_url).status_code, 403)
