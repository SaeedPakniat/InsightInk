from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser, Group
from django.db import IntegrityError, transaction
from django.test import TestCase

from .models import CreatorProfile
from .permissions import IsCreator, is_creator
from accounts.permissions import MODERATOR_GROUP_NAME, is_moderator


class CreatorProfileModelTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            email="creator@example.com",
            password="test-password",
        )

    def test_profile_can_be_created_for_custom_user(self):
        profile = CreatorProfile.objects.create(user=self.user)

        self.assertEqual(profile.user, self.user)
        self.assertEqual(self.user.creator_profile, profile)
        self.assertEqual(settings.AUTH_USER_MODEL, "accounts.User")
        self.assertIs(
            CreatorProfile._meta.get_field("user").remote_field.model,
            get_user_model(),
        )

    def test_user_can_exist_without_creator_profile(self):
        self.assertFalse(CreatorProfile.objects.filter(user=self.user).exists())

    def test_user_cannot_have_multiple_creator_profiles(self):
        CreatorProfile.objects.create(user=self.user)

        with self.assertRaises(IntegrityError), transaction.atomic():
            CreatorProfile.objects.create(user=self.user)

    def test_documented_profile_fields_have_expected_defaults(self):
        profile = CreatorProfile.objects.create(user=self.user)

        self.assertEqual(profile.bio_fa, "")
        self.assertEqual(profile.bio_en, "")
        self.assertEqual(profile.avatar.name, "")
        self.assertFalse(profile.is_verified)
        self.assertIsNotNone(profile.created_at)

    def test_deleting_user_cascades_to_creator_profile(self):
        profile = CreatorProfile.objects.create(user=self.user)

        self.user.delete()

        self.assertFalse(CreatorProfile.objects.filter(pk=profile.pk).exists())


class CreatorPermissionTests(TestCase):
    @staticmethod
    def request_for(user):
        return type("Request", (), {"user": user})()

    def test_anonymous_user_is_not_creator(self):
        anonymous = AnonymousUser()

        self.assertFalse(is_creator(anonymous))
        self.assertFalse(
            IsCreator().has_permission(self.request_for(anonymous), None)
        )

    def test_authenticated_user_without_profile_is_not_creator(self):
        reader = get_user_model().objects.create_user(email="reader@example.com")

        self.assertFalse(is_creator(reader))

    def test_profile_grants_creator_without_staff_or_superuser(self):
        creator = get_user_model().objects.create_user(email="creator-role@example.com")
        CreatorProfile.objects.create(user=creator)

        self.assertTrue(is_creator(creator))
        self.assertFalse(creator.is_staff)
        self.assertFalse(creator.is_superuser)
        self.assertTrue(
            IsCreator().has_permission(self.request_for(creator), None)
        )

    def test_creator_alone_is_not_moderator(self):
        creator = get_user_model().objects.create_user(email="creator-only@example.com")
        CreatorProfile.objects.create(user=creator)

        self.assertFalse(is_moderator(creator))
        self.assertFalse(
            creator.groups.filter(name=MODERATOR_GROUP_NAME).exists()
        )
