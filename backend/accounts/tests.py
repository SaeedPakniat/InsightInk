from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AbstractUser
from django.test import SimpleTestCase

from .models import User


class CustomUserConfigurationTests(SimpleTestCase):
    def test_auth_user_model_resolves_to_accounts_user(self):
        self.assertEqual(settings.AUTH_USER_MODEL, "accounts.User")
        self.assertIs(get_user_model(), User)
        self.assertTrue(issubclass(User, AbstractUser))
