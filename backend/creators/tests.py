from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.test import TestCase

from .models import CreatorProfile


class CreatorProfileModelTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="creator",
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
