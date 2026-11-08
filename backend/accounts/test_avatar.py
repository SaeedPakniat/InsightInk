import io
import tempfile

from PIL import Image
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIClient

from .models import User


class AccountAvatarAPITests(TestCase):
    password = "Correct-Horse-Battery-Staple-2026!"

    def setUp(self):
        self.media_directory = tempfile.TemporaryDirectory()
        self.media_override = override_settings(MEDIA_ROOT=self.media_directory.name)
        self.media_override.enable()
        self.addCleanup(self.media_override.disable)
        self.addCleanup(self.media_directory.cleanup)

        self.client = APIClient(enforce_csrf_checks=True)
        self.user = User.objects.create_user(
            email="avatar@example.com",
            password=self.password,
            display_name="Original Name",
            preferred_ui_language=User.Language.ENGLISH,
        )
        self.me_url = reverse("api:accounts:me")
        self.avatar_url = reverse("api:accounts:me-avatar")
        self.csrf_url = reverse("api:accounts:csrf")

    @staticmethod
    def image_upload(image_format, *, name=None, oversized=False):
        output = io.BytesIO()
        Image.new("RGB", (16, 16), color=(35, 90, 140)).save(
            output,
            format=image_format,
        )
        content = output.getvalue()
        if oversized:
            content += b"\0" * (5 * 1024 * 1024 + 1 - len(content))
        extension = {
            "JPEG": "jpg",
            "PNG": "png",
            "WEBP": "webp",
            "GIF": "gif",
            "BMP": "bmp",
        }[image_format]
        return SimpleUploadedFile(
            name or f"avatar.{extension}",
            content,
            content_type=f"image/{extension}",
        )

    def authenticate(self):
        self.client.force_login(self.user)
        response = self.client.get(self.csrf_url)
        self.assertEqual(response.status_code, 200)
        return response.json()["csrfToken"]

    def upload(self, upload, *, token=None):
        token = token or self.authenticate()
        return self.client.put(
            self.avatar_url,
            data={"avatar": upload},
            format="multipart",
            HTTP_X_CSRFTOKEN=token,
        )

    def test_avatar_field_belongs_to_user_and_is_optional(self):
        field = User._meta.get_field("avatar")

        self.assertTrue(field.blank)
        self.assertTrue(field.null)
        self.assertEqual(field.upload_to, "user_avatars/")
        self.assertFalse(self.user.avatar)

    def test_me_without_avatar_returns_null_and_safe_fields(self):
        self.client.force_login(self.user)

        response = self.client.get(self.me_url)

        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.json()["avatar_url"])
        self.assertEqual(
            response.json()["capabilities"],
            {"can_moderate": False, "can_administer": False},
        )
        self.assertTrue(
            {
                "password",
                "is_staff",
                "is_superuser",
                "groups",
                "user_permissions",
            }.isdisjoint(response.json())
        )

    def test_patch_updates_only_explicit_metadata_with_partial_semantics(self):
        token = self.authenticate()
        response = self.client.patch(
            self.me_url,
            data={"display_name": "New Name"},
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )

        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.display_name, "New Name")
        self.assertEqual(self.user.preferred_ui_language, User.Language.ENGLISH)
        self.assertEqual(
            set(response.json()),
            {
                "id",
                "email",
                "display_name",
                "preferred_ui_language",
                "avatar_url",
                "capabilities",
            },
        )

    def test_patch_updates_preferred_ui_language(self):
        token = self.authenticate()

        response = self.client.patch(
            self.me_url,
            data={"preferred_ui_language": User.Language.PERSIAN},
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )

        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.preferred_ui_language, User.Language.PERSIAN)

    def test_patch_rejects_invalid_ui_language(self):
        token = self.authenticate()

        response = self.client.patch(
            self.me_url,
            data={"preferred_ui_language": "de"},
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )

        self.assertEqual(response.status_code, 400)
        self.user.refresh_from_db()
        self.assertEqual(self.user.preferred_ui_language, User.Language.ENGLISH)

    def test_patch_ignores_non_writable_account_and_auth_fields(self):
        original_email = self.user.email
        token = self.authenticate()

        response = self.client.patch(
            self.me_url,
            data={
                "email": "attacker@example.com",
                "avatar": "user_avatars/forged.png",
                "password": "forged",
                "is_staff": True,
                "is_superuser": True,
                "groups": [1],
                "user_permissions": [1],
                "capabilities": {
                    "can_moderate": True,
                    "can_administer": True,
                },
            },
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )

        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, original_email)
        self.assertFalse(self.user.avatar)
        self.assertFalse(self.user.is_staff)
        self.assertFalse(self.user.is_superuser)
        self.assertFalse(self.user.groups.exists())
        self.assertFalse(self.user.user_permissions.exists())

    def test_patch_requires_authentication_and_csrf(self):
        anonymous = self.client.patch(
            self.me_url,
            data={"display_name": "Anonymous"},
            format="json",
        )
        self.assertEqual(anonymous.status_code, 403)

        self.client.force_login(self.user)
        without_csrf = self.client.patch(
            self.me_url,
            data={"display_name": "No CSRF"},
            format="json",
        )
        self.assertEqual(without_csrf.status_code, 403)
        self.user.refresh_from_db()
        self.assertEqual(self.user.display_name, "Original Name")

    def test_jpeg_png_and_webp_uploads_are_accepted(self):
        token = self.authenticate()

        for image_format in ("JPEG", "PNG", "WEBP"):
            with self.subTest(image_format=image_format):
                with self.captureOnCommitCallbacks(execute=True):
                    response = self.upload(
                        self.image_upload(image_format),
                        token=token,
                    )
                self.assertEqual(response.status_code, 200)
                self.user.refresh_from_db()
                self.assertTrue(self.user.avatar.name.startswith("user_avatars/"))
                self.assertTrue(default_storage.exists(self.user.avatar.name))
                self.assertTrue(
                    response.json()["avatar_url"].startswith(
                        "http://testserver/media/user_avatars/"
                    )
                )

    def test_upload_requires_authentication_csrf_and_multipart(self):
        anonymous = self.client.put(
            self.avatar_url,
            data={"avatar": self.image_upload("PNG")},
            format="multipart",
        )
        self.assertEqual(anonymous.status_code, 403)

        self.client.force_login(self.user)
        without_csrf = self.client.put(
            self.avatar_url,
            data={"avatar": self.image_upload("PNG")},
            format="multipart",
        )
        self.assertEqual(without_csrf.status_code, 403)

        token = self.client.get(self.csrf_url).json()["csrfToken"]
        non_multipart = self.client.put(
            self.avatar_url,
            data={"avatar": "not-an-upload"},
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )
        self.assertEqual(non_multipart.status_code, 415)

    def test_invalid_unsupported_and_oversized_uploads_are_rejected(self):
        token = self.authenticate()
        uploads = (
            self.image_upload("GIF"),
            self.image_upload("BMP"),
            SimpleUploadedFile("avatar.png", b"not an image", "image/png"),
            self.image_upload("PNG", oversized=True),
        )

        for upload in uploads:
            with self.subTest(name=upload.name, size=upload.size):
                response = self.upload(upload, token=token)
                self.assertEqual(response.status_code, 400)
                self.user.refresh_from_db()
                self.assertFalse(self.user.avatar)

    def test_valid_replacement_deletes_old_file_after_commit(self):
        token = self.authenticate()
        with self.captureOnCommitCallbacks(execute=True):
            first = self.upload(
                self.image_upload("PNG", name="first.png"),
                token=token,
            )
        self.assertEqual(first.status_code, 200)
        self.user.refresh_from_db()
        old_name = self.user.avatar.name

        with self.captureOnCommitCallbacks(execute=True):
            second = self.upload(
                self.image_upload("JPEG", name="second.jpg"),
                token=token,
            )

        self.assertEqual(second.status_code, 200)
        self.user.refresh_from_db()
        self.assertNotEqual(self.user.avatar.name, old_name)
        self.assertFalse(default_storage.exists(old_name))
        self.assertTrue(default_storage.exists(self.user.avatar.name))

    def test_failed_replacement_preserves_existing_avatar_and_file(self):
        token = self.authenticate()
        with self.captureOnCommitCallbacks(execute=True):
            first = self.upload(self.image_upload("PNG"), token=token)
        self.assertEqual(first.status_code, 200)
        self.user.refresh_from_db()
        old_name = self.user.avatar.name

        response = self.upload(
            SimpleUploadedFile("bad.png", b"broken", "image/png"),
            token=token,
        )

        self.assertEqual(response.status_code, 400)
        self.user.refresh_from_db()
        self.assertEqual(self.user.avatar.name, old_name)
        self.assertTrue(default_storage.exists(old_name))

    def test_delete_removes_avatar_after_commit_and_is_idempotent(self):
        token = self.authenticate()
        with self.captureOnCommitCallbacks(execute=True):
            uploaded = self.upload(self.image_upload("PNG"), token=token)
        self.assertEqual(uploaded.status_code, 200)
        self.user.refresh_from_db()
        old_name = self.user.avatar.name

        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.delete(
                self.avatar_url,
                HTTP_X_CSRFTOKEN=token,
            )

        self.assertEqual(response.status_code, 204)
        self.user.refresh_from_db()
        self.assertFalse(self.user.avatar)
        self.assertFalse(default_storage.exists(old_name))
        self.assertIsNone(self.client.get(self.me_url).json()["avatar_url"])

        repeated = self.client.delete(
            self.avatar_url,
            HTTP_X_CSRFTOKEN=token,
        )
        self.assertEqual(repeated.status_code, 204)

    def test_delete_requires_authentication_and_csrf(self):
        anonymous = self.client.delete(self.avatar_url)
        self.assertEqual(anonymous.status_code, 403)

        self.client.force_login(self.user)
        without_csrf = self.client.delete(self.avatar_url)
        self.assertEqual(without_csrf.status_code, 403)


class MediaConfigurationTests(TestCase):
    def test_local_media_configuration_is_defined(self):
        self.assertEqual(settings.MEDIA_URL, "/media/")
        self.assertEqual(settings.MEDIA_ROOT, settings.BASE_DIR / "media")
