from django.contrib.admin.sites import AdminSite
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AbstractUser, Group, Permission
from django.contrib.sessions.models import Session
from django.core.exceptions import FieldDoesNotExist, PermissionDenied
from django.db import IntegrityError, transaction
from django.test import SimpleTestCase, TestCase
from django.urls import reverse
from rest_framework.authentication import SessionAuthentication
from rest_framework.settings import api_settings
from rest_framework.test import APIClient

from .admin import CustomUserAdmin
from .forms import CustomUserChangeForm, CustomUserCreationForm
from content.models import Topic

from .models import User, UserInterest
from .permissions import (
    MODERATOR_GROUP_NAME,
    IsAdmin,
    IsModerator,
    is_admin,
    is_moderator,
)
from .services import set_moderator


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

    def test_user_has_no_duplicate_role_field(self):
        field_names = {field.name for field in User._meta.get_fields()}

        self.assertTrue(
            {"role", "account_type", "user_type", "is_creator", "is_moderator"}
            .isdisjoint(field_names)
        )


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
                "capabilities": {
                    "can_moderate": False,
                    "can_administer": False,
                },
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
            {
                "id",
                "email",
                "display_name",
                "preferred_ui_language",
                "capabilities",
            },
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
            {
                "id",
                "email",
                "display_name",
                "preferred_ui_language",
                "capabilities",
            },
        )
        self.assertNotIn("password", response.json())
        self.assertEqual(
            response.json()["capabilities"],
            {
                "can_moderate": False,
                "can_administer": False,
            },
        )
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
                "capabilities": {
                    "can_moderate": True,
                    "can_administer": True,
                },
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


    def test_capabilities_reflect_existing_authorization_helpers(self):
        moderator_group = Group.objects.get(name=MODERATOR_GROUP_NAME)
        cases = []

        ordinary = self.create_user(email="caps-ordinary@example.com")
        cases.append(
            (
                ordinary,
                {"can_moderate": False, "can_administer": False},
            )
        )

        staff_only = self.create_user(
            email="caps-staff-only@example.com",
            is_staff=True,
        )
        cases.append(
            (
                staff_only,
                {"can_moderate": False, "can_administer": False},
            )
        )

        moderator = self.create_user(
            email="caps-moderator@example.com",
            is_staff=True,
        )
        moderator.groups.add(moderator_group)
        cases.append(
            (
                moderator,
                {"can_moderate": True, "can_administer": False},
            )
        )

        admin = User.objects.create_superuser(
            email="caps-admin@example.com",
            password=self.password,
        )
        cases.append(
            (
                admin,
                {"can_moderate": True, "can_administer": True},
            )
        )

        for user, expected in cases:
            with self.subTest(user=user.email):
                self.client.force_login(user)
                response = self.client.get(self.me_url)
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.json()["capabilities"], expected)
                self.client.logout()


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


class AuthorizationPermissionTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="reader-permissions@example.com")
        self.moderator_group = Group.objects.get(name=MODERATOR_GROUP_NAME)

    @staticmethod
    def request_for(user):
        return type("Request", (), {"user": user})()

    def test_moderator_group_is_provisioned(self):
        self.assertEqual(self.moderator_group.name, "Moderator")

    def test_ordinary_user_is_not_moderator(self):
        self.assertFalse(is_moderator(self.user))
        self.assertFalse(
            IsModerator().has_permission(self.request_for(self.user), None)
        )

    def test_group_and_staff_capability_are_both_required_for_moderator(self):
        self.user.groups.add(self.moderator_group)
        self.assertFalse(is_moderator(self.user))

        self.user.is_staff = True
        self.user.save(update_fields=["is_staff"])

        self.assertTrue(is_moderator(self.user))
        self.assertTrue(
            IsModerator().has_permission(self.request_for(self.user), None)
        )

    def test_staff_without_group_is_not_moderator(self):
        self.user.is_staff = True
        self.user.save(update_fields=["is_staff"])

        self.assertFalse(is_moderator(self.user))

    def test_ordinary_user_is_not_admin(self):
        self.assertFalse(is_admin(self.user))
        self.assertFalse(IsAdmin().has_permission(self.request_for(self.user), None))

    def test_moderator_is_not_admin(self):
        self.user.is_staff = True
        self.user.save(update_fields=["is_staff"])
        self.user.groups.add(self.moderator_group)

        self.assertTrue(is_moderator(self.user))
        self.assertFalse(is_admin(self.user))

    def test_superuser_is_admin(self):
        admin = User.objects.create_superuser(email="admin-permissions@example.com")

        self.assertTrue(is_admin(admin))
        self.assertTrue(IsAdmin().has_permission(self.request_for(admin), None))


class ModeratorAssignmentServiceTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(email="admin@example.com")
        self.target = User.objects.create_user(email="target@example.com")
        self.moderator_group = Group.objects.get(name=MODERATOR_GROUP_NAME)

    def create_moderator(self, email="moderator@example.com"):
        moderator = User.objects.create_user(email=email, is_staff=True)
        moderator.groups.add(self.moderator_group)
        return moderator

    def assert_assignment_denied(self, actor, *, enabled=True):
        with self.assertRaises(PermissionDenied):
            set_moderator(actor=actor, target_user=self.target, enabled=enabled)

    def test_admin_can_assign_moderator(self):
        set_moderator(actor=self.admin, target_user=self.target, enabled=True)
        self.target.refresh_from_db()

        self.assertTrue(is_moderator(self.target))
        self.assertTrue(self.target.is_staff)

    def test_admin_can_remove_moderator(self):
        set_moderator(actor=self.admin, target_user=self.target, enabled=True)

        set_moderator(actor=self.admin, target_user=self.target, enabled=False)
        self.target.refresh_from_db()

        self.assertFalse(is_moderator(self.target))
        self.assertFalse(self.target.groups.filter(name=MODERATOR_GROUP_NAME).exists())

    def test_removal_does_not_clear_untracked_staff_authority(self):
        self.target.is_staff = True
        self.target.save(update_fields=["is_staff"])
        self.target.groups.add(self.moderator_group)

        set_moderator(actor=self.admin, target_user=self.target, enabled=False)
        self.target.refresh_from_db()

        self.assertTrue(self.target.is_staff)
        self.assertFalse(is_moderator(self.target))

    def test_moderator_cannot_assign_moderator(self):
        self.assert_assignment_denied(self.create_moderator())

    def test_moderator_cannot_remove_moderator(self):
        self.target.is_staff = True
        self.target.save(update_fields=["is_staff"])
        self.target.groups.add(self.moderator_group)

        self.assert_assignment_denied(self.create_moderator(), enabled=False)
        self.assertTrue(is_moderator(self.target))

    def test_creator_cannot_assign_moderator(self):
        from creators.models import CreatorProfile

        creator = User.objects.create_user(email="creator-role@example.com")
        CreatorProfile.objects.create(user=creator)

        self.assert_assignment_denied(creator)

    def test_ordinary_user_cannot_assign_moderator(self):
        ordinary_user = User.objects.create_user(email="ordinary-role@example.com")

        self.assert_assignment_denied(ordinary_user)

    def test_assignment_preserves_unrelated_groups_and_permissions(self):
        unrelated_group = Group.objects.create(name="Publishing Team")
        unrelated_permission = Permission.objects.get(
            content_type__app_label="auth",
            codename="view_group",
        )
        self.target.groups.add(unrelated_group)
        self.target.user_permissions.add(unrelated_permission)

        set_moderator(actor=self.admin, target_user=self.target, enabled=True)
        set_moderator(actor=self.admin, target_user=self.target, enabled=False)

        self.assertTrue(self.target.groups.filter(pk=unrelated_group.pk).exists())
        self.assertTrue(
            self.target.user_permissions.filter(pk=unrelated_permission.pk).exists()
        )

    def test_moderator_group_has_no_broad_auth_administration_permissions(self):
        prohibited_codenames = {
            "change_user",
            "change_group",
            "add_group",
            "delete_group",
        }

        self.assertFalse(
            self.moderator_group.permissions.filter(
                content_type__app_label="auth",
                codename__in=prohibited_codenames,
            ).exists()
        )


class UserInterestModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="interest-model@example.com")
        self.topic = Topic.objects.create(
            slug="interest-model",
            name_fa="علاقه",
            name_en="Interest",
        )

    def test_user_topic_pair_is_unique(self):
        UserInterest.objects.create(user=self.user, topic=self.topic)

        with self.assertRaises(IntegrityError), transaction.atomic():
            UserInterest.objects.create(user=self.user, topic=self.topic)


class UserInterestsAPITests(TestCase):
    def setUp(self):
        self.client = APIClient(enforce_csrf_checks=True)
        self.user = User.objects.create_user(email="interests-api@example.com")
        self.other_user = User.objects.create_user(email="other-interests@example.com")
        self.first = Topic.objects.create(
            slug="science-interest",
            name_fa="علم",
            name_en="Science",
        )
        self.second = Topic.objects.create(
            slug="history-interest",
            name_fa="تاریخ",
            name_en="History",
        )
        self.inactive = Topic.objects.create(
            slug="inactive-interest",
            name_fa="غیرفعال",
            name_en="Inactive",
            is_active=False,
        )
        self.url = reverse("api:accounts:me-interests")
        self.csrf_url = reverse("api:accounts:csrf")

    def csrf_token(self):
        response = self.client.get(self.csrf_url)
        self.assertEqual(response.status_code, 200)
        return response.json()["csrfToken"]

    def test_interests_require_authentication(self):
        self.assertEqual(self.client.get(self.url).status_code, 403)

    def test_get_returns_only_current_users_active_interests(self):
        UserInterest.objects.create(user=self.user, topic=self.first)
        UserInterest.objects.create(user=self.user, topic=self.inactive)
        UserInterest.objects.create(user=self.other_user, topic=self.second)
        self.client.force_login(self.user)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [topic["id"] for topic in response.json()["topics"]],
            [self.first.id],
        )

    def test_put_replaces_complete_interest_set(self):
        UserInterest.objects.create(user=self.user, topic=self.first)
        self.client.force_login(self.user)
        token = self.csrf_token()

        response = self.client.put(
            self.url,
            data={"topics": [self.second.id]},
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["topics"][0]["id"], self.second.id)
        self.assertQuerySetEqual(
            UserInterest.objects.filter(user=self.user).values_list(
                "topic_id", flat=True
            ),
            [self.second.id],
        )

    def test_put_is_idempotent(self):
        self.client.force_login(self.user)
        token = self.csrf_token()

        for _ in range(2):
            response = self.client.put(
                self.url,
                data={"topics": [self.first.id, self.second.id]},
                format="json",
                HTTP_X_CSRFTOKEN=token,
            )
            self.assertEqual(response.status_code, 200)

        self.assertEqual(UserInterest.objects.filter(user=self.user).count(), 2)

    def test_put_empty_list_clears_interests(self):
        UserInterest.objects.create(user=self.user, topic=self.first)
        self.client.force_login(self.user)
        token = self.csrf_token()

        response = self.client.put(
            self.url,
            data={"topics": []},
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["topics"], [])
        self.assertFalse(UserInterest.objects.filter(user=self.user).exists())

    def test_inactive_or_unknown_topic_is_rejected_without_replacing_existing(self):
        UserInterest.objects.create(user=self.user, topic=self.first)
        self.client.force_login(self.user)
        token = self.csrf_token()

        for topic_id in (self.inactive.id, self.inactive.id + 9999):
            with self.subTest(topic_id=topic_id):
                response = self.client.put(
                    self.url,
                    data={"topics": [topic_id]},
                    format="json",
                    HTTP_X_CSRFTOKEN=token,
                )
                self.assertEqual(response.status_code, 400)
                self.assertTrue(
                    UserInterest.objects.filter(
                        user=self.user,
                        topic=self.first,
                    ).exists()
                )

    def test_duplicate_topic_ids_are_rejected(self):
        self.client.force_login(self.user)
        token = self.csrf_token()

        response = self.client.put(
            self.url,
            data={"topics": [self.first.id, self.first.id]},
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("topics", response.json())

    def test_put_requires_csrf(self):
        self.client.force_login(self.user)

        response = self.client.put(
            self.url,
            data={"topics": [self.first.id]},
            format="json",
        )

        self.assertEqual(response.status_code, 403)
        self.assertFalse(UserInterest.objects.filter(user=self.user).exists())
