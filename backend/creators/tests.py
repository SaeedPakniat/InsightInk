from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser, Group
from django.db import IntegrityError, transaction
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from content.models import Idea, Source
from engagement.models import Spark

from .models import CreatorFollow, CreatorProfile
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


class CreatorProfileWorkspaceAPITests(TestCase):
    def setUp(self):
        self.client = APIClient(enforce_csrf_checks=True)
        self.user = get_user_model().objects.create_user(
            email="workspace-reader@example.com"
        )
        self.other_user = get_user_model().objects.create_user(
            email="workspace-other@example.com"
        )
        self.url = reverse("api:creators:me-creator")
        self.csrf_url = reverse("api:accounts:csrf")

    def csrf_token(self):
        response = self.client.get(self.csrf_url)
        self.assertEqual(response.status_code, 200)
        return response.json()["csrfToken"]

    def test_anonymous_cannot_access_creator_workspace(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 403)

    def test_reader_without_profile_gets_404(self):
        self.client.force_login(self.user)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 404)

    def test_reader_can_create_only_their_own_creator_profile(self):
        self.client.force_login(self.user)
        token = self.csrf_token()

        response = self.client.post(
            self.url,
            data={
                "user_id": self.other_user.id,
                "bio_fa": "زیست فارسی",
                "bio_en": "English bio",
                "is_verified": True,
            },
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )

        self.assertEqual(response.status_code, 201)
        profile = CreatorProfile.objects.get(user=self.user)
        self.assertEqual(profile.bio_fa, "زیست فارسی")
        self.assertEqual(profile.bio_en, "English bio")
        self.assertFalse(profile.is_verified)
        self.assertFalse(CreatorProfile.objects.filter(user=self.other_user).exists())
        self.assertEqual(
            set(response.json()),
            {
                "id",
                "user_id",
                "bio_fa",
                "bio_en",
                "avatar",
                "is_verified",
                "created_at",
            },
        )
        self.assertEqual(response.json()["user_id"], self.user.id)

    def test_creator_cannot_create_second_profile(self):
        CreatorProfile.objects.create(user=self.user)
        self.client.force_login(self.user)
        token = self.csrf_token()

        response = self.client.post(
            self.url,
            data={},
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(CreatorProfile.objects.filter(user=self.user).count(), 1)

    def test_creator_can_retrieve_and_patch_editable_fields_only(self):
        profile = CreatorProfile.objects.create(user=self.user)
        self.client.force_login(self.user)
        token = self.csrf_token()

        get_response = self.client.get(self.url)
        patch_response = self.client.patch(
            self.url,
            data={
                "bio_en": "Updated bio",
                "user_id": self.other_user.id,
                "is_verified": True,
            },
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )

        self.assertEqual(get_response.status_code, 200)
        self.assertEqual(patch_response.status_code, 200)
        profile.refresh_from_db()
        self.assertEqual(profile.user, self.user)
        self.assertEqual(profile.bio_en, "Updated bio")
        self.assertFalse(profile.is_verified)

    def test_profile_write_requires_csrf(self):
        self.client.force_login(self.user)

        response = self.client.post(self.url, data={}, format="json")

        self.assertEqual(response.status_code, 403)
        self.assertFalse(CreatorProfile.objects.filter(user=self.user).exists())


class CreatorFollowModelTests(TestCase):
    def setUp(self):
        self.reader = get_user_model().objects.create_user(
            email="follow-reader@example.com"
        )
        creator_user = get_user_model().objects.create_user(
            email="follow-creator@example.com"
        )
        self.creator = CreatorProfile.objects.create(user=creator_user)

    def test_user_creator_pair_is_unique(self):
        CreatorFollow.objects.create(user=self.reader, creator=self.creator)

        with self.assertRaises(IntegrityError), transaction.atomic():
            CreatorFollow.objects.create(user=self.reader, creator=self.creator)


class PublicCreatorAPITests(TestCase):
    def setUp(self):
        self.client = APIClient(enforce_csrf_checks=True)
        self.reader = get_user_model().objects.create_user(
            email="public-reader@example.com",
            display_name="Reader",
        )
        self.creator_user = get_user_model().objects.create_user(
            email="public-creator@example.com",
            display_name="Public Creator",
        )
        self.creator = CreatorProfile.objects.create(
            user=self.creator_user,
            bio_fa="زیست فارسی",
            bio_en="English bio",
            is_verified=True,
        )
        self.other_creator_user = get_user_model().objects.create_user(
            email="second-public-creator@example.com",
            display_name="Second Creator",
        )
        self.other_creator = CreatorProfile.objects.create(
            user=self.other_creator_user
        )
        self.source = Source.objects.create(
            type=Source.SourceType.ARTICLE,
            title="Creator Source",
            language="en",
        )
        self.published = self.create_idea(
            creator=self.creator,
            title="Published Creator Idea",
            status=Idea.IdeaStatus.PUBLISHED,
        )
        self.second_published = self.create_idea(
            creator=self.creator,
            title="Second Published",
            status=Idea.IdeaStatus.PUBLISHED,
        )
        self.draft = self.create_idea(
            creator=self.creator,
            title="Creator Draft",
            status=Idea.IdeaStatus.DRAFT,
        )
        self.hidden = self.create_idea(
            creator=self.creator,
            title="Creator Hidden",
            status=Idea.IdeaStatus.HIDDEN,
        )
        self.list_url = reverse("api:creators:creator-list")
        self.detail_url = reverse(
            "api:creators:creator-detail",
            args=[self.creator.id],
        )
        self.ideas_url = reverse(
            "api:creators:creator-ideas",
            args=[self.creator.id],
        )
        self.follow_url = reverse(
            "api:creators:creator-follow",
            args=[self.creator.id],
        )
        self.csrf_url = reverse("api:accounts:csrf")

    def create_idea(self, *, creator, title, status):
        return Idea.objects.create(
            creator=creator,
            source=self.source,
            language="en",
            title=title,
            body="Creator idea body",
            estimated_read_seconds=60,
            status=status,
        )

    def csrf_token(self):
        response = self.client.get(self.csrf_url)
        self.assertEqual(response.status_code, 200)
        return response.json()["csrfToken"]

    def request_with_csrf(self, method, url):
        token = self.csrf_token()
        return getattr(self.client, method)(
            url,
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )

    def test_public_creator_list_is_anonymous_and_safe(self):
        response = APIClient().get(self.list_url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [item["id"] for item in response.json()],
            [self.creator.id, self.other_creator.id],
        )
        item = response.json()[0]
        self.assertEqual(
            set(item),
            {
                "id",
                "display_name",
                "bio_fa",
                "bio_en",
                "avatar",
                "is_verified",
                "follower_count",
                "spark_count",
                "idea_count",
            },
        )
        self.assertNotIn("email", item)
        self.assertNotIn("user_id", item)

    def test_creator_detail_exposes_bio_and_published_reach_counts_only(self):
        follower_two = get_user_model().objects.create_user(
            email="second-follower@example.com"
        )
        CreatorFollow.objects.create(user=self.reader, creator=self.creator)
        CreatorFollow.objects.create(user=follower_two, creator=self.creator)
        Spark.objects.create(user=self.reader, idea=self.published)
        Spark.objects.create(user=follower_two, idea=self.second_published)
        Spark.objects.create(user=self.reader, idea=self.draft)

        response = APIClient().get(self.detail_url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["display_name"], "Public Creator")
        self.assertEqual(response.json()["bio_en"], "English bio")
        self.assertTrue(response.json()["is_verified"])
        self.assertEqual(response.json()["follower_count"], 2)
        self.assertEqual(response.json()["idea_count"], 2)
        self.assertEqual(response.json()["spark_count"], 2)

    def test_creator_ideas_returns_published_only_with_cursor_envelope(self):
        response = APIClient().get(self.ideas_url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(set(response.json()), {"next", "previous", "results"})
        self.assertEqual(
            [item["id"] for item in response.json()["results"]],
            [self.second_published.id, self.published.id],
        )
        returned_ids = {item["id"] for item in response.json()["results"]}
        self.assertNotIn(self.draft.id, returned_ids)
        self.assertNotIn(self.hidden.id, returned_ids)

    def test_missing_creator_ideas_returns_404(self):
        response = APIClient().get(
            reverse("api:creators:creator-ideas", args=[self.creator.id + 9999])
        )

        self.assertEqual(response.status_code, 404)

    def test_follow_requires_authentication_and_csrf(self):
        anonymous = self.client.put(self.follow_url, format="json")
        self.assertEqual(anonymous.status_code, 403)

        self.client.force_login(self.reader)
        no_csrf = self.client.put(self.follow_url, format="json")
        self.assertEqual(no_csrf.status_code, 403)

    def test_follow_and_unfollow_are_idempotent(self):
        self.client.force_login(self.reader)

        first_put = self.request_with_csrf("put", self.follow_url)
        second_put = self.request_with_csrf("put", self.follow_url)

        self.assertEqual(first_put.status_code, 204)
        self.assertEqual(second_put.status_code, 204)
        self.assertEqual(
            CreatorFollow.objects.filter(
                user=self.reader,
                creator=self.creator,
            ).count(),
            1,
        )

        first_delete = self.request_with_csrf("delete", self.follow_url)
        second_delete = self.request_with_csrf("delete", self.follow_url)

        self.assertEqual(first_delete.status_code, 204)
        self.assertEqual(second_delete.status_code, 204)
        self.assertFalse(
            CreatorFollow.objects.filter(
                user=self.reader,
                creator=self.creator,
            ).exists()
        )

    def test_creator_cannot_follow_self(self):
        self.client.force_login(self.creator_user)
        token = self.csrf_token()

        response = self.client.put(
            self.follow_url,
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(
            CreatorFollow.objects.filter(
                user=self.creator_user,
                creator=self.creator,
            ).exists()
        )

    def test_follow_changes_public_follower_count(self):
        self.client.force_login(self.reader)

        before = APIClient().get(self.detail_url)
        self.assertEqual(before.json()["follower_count"], 0)

        response = self.request_with_csrf("put", self.follow_url)
        self.assertEqual(response.status_code, 204)

        after = APIClient().get(self.detail_url)
        self.assertEqual(after.json()["follower_count"], 1)


class ViewerCreatorFollowStateAPITests(TestCase):
    def setUp(self):
        self.reader = get_user_model().objects.create_user(
            email="follow-state-reader@example.com",
            display_name="Reader",
        )
        self.other_reader = get_user_model().objects.create_user(
            email="follow-state-other@example.com",
            display_name="Other Reader",
        )
        self.own_creator = CreatorProfile.objects.create(user=self.reader)

        self.creator_users = []
        self.creators = []
        for index in range(3):
            user = get_user_model().objects.create_user(
                email=f"follow-state-creator-{index}@example.com",
                display_name=f"Creator {index}",
            )
            self.creator_users.append(user)
            self.creators.append(CreatorProfile.objects.create(user=user))

        self.url = reverse("api:creators:me-creator-follows")
        CreatorFollow.objects.create(
            user=self.reader,
            creator=self.creators[1],
        )

    def authenticated_client(self):
        client = APIClient()
        client.force_authenticate(user=self.reader)
        return client

    def test_anonymous_get_is_rejected(self):
        response = APIClient().get(
            self.url,
            {"creator_ids": str(self.creators[0].id)},
        )

        self.assertEqual(response.status_code, 403)

    def test_authenticated_get_returns_followed_and_unfollowed_false_states(self):
        response = self.authenticated_client().get(
            self.url,
            {
                "creator_ids": (
                    f"{self.creators[0].id},"
                    f"{self.creators[1].id},"
                    f"{self.creators[2].id}"
                )
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "items": [
                    {
                        "creator_id": self.creators[0].id,
                        "following": False,
                        "can_follow": True,
                    },
                    {
                        "creator_id": self.creators[1].id,
                        "following": True,
                        "can_follow": True,
                    },
                    {
                        "creator_id": self.creators[2].id,
                        "following": False,
                        "can_follow": True,
                    },
                ]
            },
        )

    def test_own_creator_returns_can_follow_false_and_following_false(self):
        # Even if invalid legacy data somehow exists, viewer state must not
        # advertise the authenticated user's own profile as followable/following.
        CreatorFollow.objects.create(
            user=self.reader,
            creator=self.own_creator,
        )

        response = self.authenticated_client().get(
            self.url,
            {"creator_ids": str(self.own_creator.id)},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "items": [
                    {
                        "creator_id": self.own_creator.id,
                        "following": False,
                        "can_follow": False,
                    }
                ]
            },
        )

    def test_other_users_follow_does_not_affect_current_user_state(self):
        CreatorFollow.objects.create(
            user=self.other_reader,
            creator=self.creators[0],
        )

        response = self.authenticated_client().get(
            self.url,
            {"creator_ids": str(self.creators[0].id)},
        )

        self.assertEqual(
            response.json()["items"][0],
            {
                "creator_id": self.creators[0].id,
                "following": False,
                "can_follow": True,
            },
        )

    def test_duplicate_ids_are_normalized_preserving_first_occurrence_order(self):
        response = self.authenticated_client().get(
            self.url,
            {
                "creator_ids": (
                    f"{self.creators[2].id},"
                    f"{self.creators[0].id},"
                    f"{self.creators[2].id},"
                    f"{self.creators[1].id},"
                    f"{self.creators[0].id}"
                )
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [item["creator_id"] for item in response.json()["items"]],
            [
                self.creators[2].id,
                self.creators[0].id,
                self.creators[1].id,
            ],
        )

    def test_missing_and_empty_creator_ids_are_rejected(self):
        client = self.authenticated_client()

        missing = client.get(self.url)
        empty = client.get(self.url, {"creator_ids": ""})

        self.assertEqual(missing.status_code, 400)
        self.assertEqual(
            missing.json(),
            {"creator_ids": ["creator_ids query parameter is required."]},
        )
        self.assertEqual(empty.status_code, 400)
        self.assertEqual(
            empty.json(),
            {"creator_ids": ["creator_ids query parameter must not be empty."]},
        )

    def test_malformed_and_nonpositive_creator_ids_are_rejected(self):
        client = self.authenticated_client()

        for value in (
            "abc",
            "-1",
            "0",
            "1.5",
            f"{self.creators[0].id},abc",
        ):
            with self.subTest(value=value):
                response = client.get(self.url, {"creator_ids": value})
                self.assertEqual(response.status_code, 400)
                self.assertEqual(
                    response.json(),
                    {
                        "creator_ids": [
                            "creator_ids must be a comma-separated list of positive integers."
                        ]
                    },
                )

    def test_more_than_100_requested_creator_ids_is_rejected(self):
        response = self.authenticated_client().get(
            self.url,
            {"creator_ids": ",".join(str(index) for index in range(1, 102))},
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json(),
            {
                "creator_ids": [
                    "At most 100 CreatorProfile IDs may be requested."
                ]
            },
        )

    def test_nonexistent_creator_is_omitted(self):
        missing_id = max(creator.id for creator in self.creators) + 10000

        response = self.authenticated_client().get(
            self.url,
            {
                "creator_ids": (
                    f"{self.creators[0].id},"
                    f"{missing_id},"
                    f"{self.creators[1].id}"
                )
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [item["creator_id"] for item in response.json()["items"]],
            [self.creators[0].id, self.creators[1].id],
        )

    def test_get_requires_no_csrf_token(self):
        client = APIClient(enforce_csrf_checks=True)
        client.force_login(self.reader)

        response = client.get(
            self.url,
            {"creator_ids": str(self.creators[0].id)},
        )

        self.assertEqual(response.status_code, 200)

    def test_query_count_is_one_for_single_and_100_creator_batches(self):
        extra_creators = []
        for index in range(96):
            user = get_user_model().objects.create_user(
                email=f"follow-state-batch-{index}@example.com"
            )
            extra_creators.append(CreatorProfile.objects.create(user=user))

        client = self.authenticated_client()

        with self.assertNumQueries(1):
            single = client.get(
                self.url,
                {"creator_ids": str(self.creators[0].id)},
            )
            self.assertEqual(single.status_code, 200)

        creator_ids = [
            self.own_creator.id,
            *[creator.id for creator in self.creators],
            *[creator.id for creator in extra_creators],
        ]
        self.assertEqual(len(creator_ids), 100)

        with self.assertNumQueries(1):
            batch = client.get(
                self.url,
                {
                    "creator_ids": ",".join(
                        str(creator_id) for creator_id in creator_ids
                    )
                },
            )
            self.assertEqual(batch.status_code, 200)
            self.assertEqual(len(batch.json()["items"]), 100)

    def test_existing_follow_mutations_remain_idempotent_and_self_follow_rejected(self):
        client = APIClient(enforce_csrf_checks=True)
        client.force_login(self.reader)
        csrf_url = reverse("api:accounts:csrf")
        token = client.get(csrf_url).json()["csrfToken"]

        target_url = reverse(
            "api:creators:creator-follow",
            args=[self.creators[0].id],
        )
        first_put = client.put(
            target_url,
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )
        second_put = client.put(
            target_url,
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )

        self.assertEqual(first_put.status_code, 204)
        self.assertEqual(second_put.status_code, 204)
        self.assertEqual(
            CreatorFollow.objects.filter(
                user=self.reader,
                creator=self.creators[0],
            ).count(),
            1,
        )

        first_delete = client.delete(
            target_url,
            HTTP_X_CSRFTOKEN=token,
        )
        second_delete = client.delete(
            target_url,
            HTTP_X_CSRFTOKEN=token,
        )
        self.assertEqual(first_delete.status_code, 204)
        self.assertEqual(second_delete.status_code, 204)

        own_url = reverse(
            "api:creators:creator-follow",
            args=[self.own_creator.id],
        )
        self_follow = client.put(
            own_url,
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )
        self.assertEqual(self_follow.status_code, 400)
