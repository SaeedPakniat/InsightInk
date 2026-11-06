from urllib.parse import urlsplit

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError as DjangoValidationError
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import UserContentLanguage
from content.language_catalog import LANGUAGE_CATALOG
from creators.models import CreatorProfile
from engagement.models import SavedIdea
from recommendations.selectors import recommendation_candidates

from .models import ContentLanguage, Idea, Source, Topic


User = get_user_model()


def replace_content_languages(user, codes):
    UserContentLanguage.objects.filter(user=user).delete()
    languages = ContentLanguage.objects.filter(code__in=codes)
    UserContentLanguage.objects.bulk_create(
        [
            UserContentLanguage(user=user, language=language)
            for language in languages
        ]
    )


class ContentLanguageCatalogAPITests(TestCase):
    def test_catalog_contains_exact_initial_supported_codes_in_order(self):
        expected_codes = [row[0] for row in LANGUAGE_CATALOG]

        response = APIClient().get(reverse("api:language-list"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 62)
        self.assertEqual(
            [item["code"] for item in response.json()],
            expected_codes,
        )
        self.assertEqual(len(expected_codes), len(set(expected_codes)))

    def test_catalog_public_shape_and_native_names(self):
        response = APIClient().get(reverse("api:language-list"))

        self.assertEqual(response.status_code, 200)
        by_code = {item["code"]: item for item in response.json()}
        self.assertEqual(
            set(by_code["ja"]),
            {"code", "name_en", "name_fa", "native_name"},
        )
        self.assertEqual(by_code["ja"]["native_name"], "日本語")
        self.assertEqual(by_code["ar"]["native_name"], "العربية")
        self.assertEqual(by_code["es"]["native_name"], "Español")

    def test_inactive_language_is_excluded_from_public_catalog(self):
        ContentLanguage.objects.filter(code="fr").update(is_active=False)

        response = APIClient().get(reverse("api:language-list"))

        self.assertEqual(response.status_code, 200)
        self.assertNotIn("fr", {item["code"] for item in response.json()})

    def test_catalog_supports_future_bcp47_length_without_changing_public_shape(self):
        language = ContentLanguage.objects.create(
            code="zh-Hant",
            name_en="Traditional Chinese",
            name_fa="چینی سنتی",
            native_name="繁體中文",
            display_order=999,
        )

        response = APIClient().get(reverse("api:language-detail", args=[language.code]))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["code"], "zh-Hant")


class ReaderContentLanguagePreferenceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="language-reader@example.com",
            preferred_ui_language=User.Language.PERSIAN,
        )
        self.other = User.objects.create_user(email="language-other@example.com")
        self.url = reverse("api:accounts:me-languages")

    def codes(self, user):
        return list(
            user.content_language_preferences.order_by(
                "language__display_order",
                "language__code",
            ).values_list("language_id", flat=True)
        )

    def test_new_user_defaults_to_english_and_persian_independent_of_ui_language(self):
        self.assertEqual(self.user.preferred_ui_language, "fa")
        self.assertEqual(self.codes(self.user), ["en", "fa"])

    def test_anonymous_get_is_rejected(self):
        response = APIClient().get(self.url)

        self.assertEqual(response.status_code, 403)

    def test_authenticated_get_returns_rich_language_metadata(self):
        client = APIClient()
        client.force_authenticate(user=self.user)

        response = client.get(self.url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [item["code"] for item in response.json()["languages"]],
            ["en", "fa"],
        )
        self.assertEqual(
            set(response.json()["languages"][0]),
            {"code", "name_en", "name_fa", "native_name"},
        )

    def test_put_replaces_selection_and_normalizes_duplicate_codes(self):
        client = APIClient()
        client.force_authenticate(user=self.user)

        response = client.put(
            self.url,
            {"languages": ["ja", "en", "ja", "ko"]},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.codes(self.user), ["en", "ja", "ko"])
        self.assertEqual(
            [item["code"] for item in response.json()["languages"]],
            ["en", "ja", "ko"],
        )

    def test_put_replacement_can_clear_selection(self):
        client = APIClient()
        client.force_authenticate(user=self.user)

        response = client.put(self.url, {"languages": []}, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"languages": []})
        self.assertEqual(self.codes(self.user), [])

    def test_unknown_language_is_rejected_without_replacing_existing(self):
        before = self.codes(self.user)
        client = APIClient()
        client.force_authenticate(user=self.user)

        response = client.put(
            self.url,
            {"languages": ["en", "abcxyz"]},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("languages", response.json())
        self.assertEqual(self.codes(self.user), before)

    def test_inactive_language_is_rejected_without_replacing_existing(self):
        ContentLanguage.objects.filter(code="ja").update(is_active=False)
        before = self.codes(self.user)
        client = APIClient()
        client.force_authenticate(user=self.user)

        response = client.put(
            self.url,
            {"languages": ["en", "ja"]},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("languages", response.json())
        self.assertEqual(self.codes(self.user), before)

    def test_preferences_are_scoped_to_current_user(self):
        client = APIClient()
        client.force_authenticate(user=self.user)

        response = client.put(
            self.url,
            {"languages": ["es", "ar"]},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.codes(self.user), ["es", "ar"])
        self.assertEqual(self.codes(self.other), ["en", "fa"])

    def test_second_identical_put_is_idempotent(self):
        client = APIClient()
        client.force_authenticate(user=self.user)
        payload = {"languages": ["en", "fa", "ja", "ko"]}

        first = client.put(self.url, payload, format="json")
        second = client.put(self.url, payload, format="json")

        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(
            UserContentLanguage.objects.filter(user=self.user).count(),
            4,
        )


class LanguageValidationTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="language-creator@example.com")
        self.creator = CreatorProfile.objects.create(user=self.user)
        self.topic = Topic.objects.create(
            slug="language-validation",
            name_fa="زبان",
            name_en="Language",
        )
        self.source = Source.objects.create(
            type=Source.SourceType.BOOK,
            title="Language Source",
            language="ja",
        )

    def idea_payload(self, language):
        return {
            "language": language,
            "title": f"{language} draft",
            "body": "A sufficiently useful draft body.",
            "estimated_read_seconds": 60,
            "source": self.source.id,
            "topics": [self.topic.id],
        }

    def test_creator_can_select_any_active_catalog_language(self):
        client = APIClient()
        client.force_authenticate(user=self.user)

        response = client.post(
            reverse("api:creator-idea-list"),
            self.idea_payload("es"),
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["language"], "es")

    def test_creator_idea_rejects_unknown_language_code(self):
        client = APIClient()
        client.force_authenticate(user=self.user)

        response = client.post(
            reverse("api:creator-idea-list"),
            self.idea_payload("abcxyz"),
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("language", response.json())

    def test_creator_idea_rejects_inactive_language_code(self):
        ContentLanguage.objects.filter(code="ja").update(is_active=False)
        client = APIClient()
        client.force_authenticate(user=self.user)

        response = client.post(
            reverse("api:creator-idea-list"),
            self.idea_payload("ja"),
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("language", response.json())

    def test_source_model_validation_rejects_unknown_and_inactive_language(self):
        unknown = Source(
            type=Source.SourceType.ARTICLE,
            title="Unknown language",
            language="abcxyz",
        )
        with self.assertRaises(DjangoValidationError):
            unknown.full_clean()

        ContentLanguage.objects.filter(code="fr").update(is_active=False)
        inactive = Source(
            type=Source.SourceType.ARTICLE,
            title="Inactive language",
            language="fr",
        )
        with self.assertRaises(DjangoValidationError):
            inactive.full_clean()

    def test_idea_and_source_language_are_independent_stable_strings(self):
        idea = Idea.objects.create(
            creator=self.creator,
            source=self.source,
            language="en",
            title="English interpretation of Japanese source",
            body="The Idea language and the original Source language are independent.",
            estimated_read_seconds=70,
            status=Idea.IdeaStatus.PUBLISHED,
            published_at=timezone.now(),
        )
        idea.topics.add(self.topic)

        response = APIClient().get(reverse("api:idea-detail", args=[idea.id]))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["language"], "en")
        self.assertEqual(response.json()["source"]["language"], "ja")


class DiscoveryLanguageFilteringTests(TestCase):
    SELECTED_CODES = ["en", "fa", "es", "ar", "ja", "ko", "zh"]
    EXCLUDED_CODES = ["tr", "ru"]

    def setUp(self):
        self.reader = User.objects.create_user(
            email="multilingual-reader@example.com",
            preferred_ui_language=User.Language.PERSIAN,
        )
        replace_content_languages(self.reader, self.SELECTED_CODES)

        creator_user = User.objects.create_user(email="multilingual-creator@example.com")
        self.creator = CreatorProfile.objects.create(user=creator_user)
        self.source = Source.objects.create(
            type=Source.SourceType.ARTICLE,
            title="Multilingual Source",
            language="en",
        )
        self.topic = Topic.objects.create(
            slug="multilingual-topic",
            name_fa="چندزبانه",
            name_en="Multilingual",
        )

        titles = {
            "en": "English language search",
            "fa": "جستجوی زبان فارسی",
            "es": "Búsqueda en español",
            "ar": "بحث باللغة العربية",
            "ja": "日本語の検索",
            "ko": "한국어 검색",
            "zh": "中文搜索测试",
            "tr": "Türkçe arama",
            "ru": "Русский поиск",
        }
        self.ideas = {
            code: self.create_idea(code=code, title=title)
            for code, title in titles.items()
        }

    def create_idea(self, *, code, title, suffix=""):
        idea = Idea.objects.create(
            creator=self.creator,
            source=self.source,
            language=code,
            title=f"{title}{suffix}",
            body=f"Searchable multilingual body for {code}{suffix}.",
            estimated_read_seconds=60,
            status=Idea.IdeaStatus.PUBLISHED,
            published_at=timezone.now(),
        )
        idea.topics.add(self.topic)
        return idea

    def authenticated_client(self):
        client = APIClient()
        client.force_authenticate(user=self.reader)
        return client

    @staticmethod
    def page_languages(response):
        return {item["language"] for item in response.json()["results"]}

    def test_authenticated_feed_defaults_to_stored_reader_languages(self):
        response = self.authenticated_client().get(reverse("api:feed"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.page_languages(response), set(self.SELECTED_CODES))
        self.assertTrue(
            self.page_languages(response).isdisjoint(self.EXCLUDED_CODES)
        )

    def test_anonymous_feed_sees_all_active_supported_languages(self):
        response = APIClient().get(reverse("api:feed"))

        self.assertEqual(response.status_code, 200)
        self.assertTrue(
            set(self.SELECTED_CODES + self.EXCLUDED_CODES).issubset(
                self.page_languages(response)
            )
        )

    def test_explicit_feed_languages_override_stored_preferences(self):
        response = self.authenticated_client().get(
            reverse("api:feed"),
            {"languages": "tr,ru,tr"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.page_languages(response), {"tr", "ru"})

    def test_unknown_explicit_feed_language_is_rejected(self):
        response = self.authenticated_client().get(
            reverse("api:feed"),
            {"languages": "en,abcxyz"},
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("languages", response.json())

    def test_filtered_feed_cursor_pages_do_not_leak_excluded_languages(self):
        for index in range(12):
            self.create_idea(
                code="en",
                title="English cursor item ",
                suffix=str(index),
            )
        for index in range(4):
            self.create_idea(
                code="tr",
                title="Turkish excluded cursor item ",
                suffix=str(index),
            )

        client = self.authenticated_client()
        first = client.get(reverse("api:feed"))
        self.assertEqual(first.status_code, 200)
        self.assertEqual(len(first.json()["results"]), 10)
        self.assertNotIn("tr", self.page_languages(first))

        next_url = urlsplit(first.json()["next"])
        second = client.get(f"{next_url.path}?{next_url.query}")
        self.assertEqual(second.status_code, 200)
        self.assertNotIn("tr", self.page_languages(second))

        first_ids = {item["id"] for item in first.json()["results"]}
        second_ids = {item["id"] for item in second.json()["results"]}
        self.assertTrue(first_ids.isdisjoint(second_ids))

    def test_search_respects_preferences_across_multiple_scripts(self):
        client = self.authenticated_client()
        checks = {
            "en": "English",
            "fa": "فارسی",
            "es": "español",
            "ar": "العربية",
            "ja": "日本語",
            "ko": "한국어",
            "zh": "中文",
        }

        for code, query in checks.items():
            with self.subTest(code=code):
                response = client.get(
                    reverse("api:explore:search"),
                    {"q": query},
                )
                self.assertEqual(response.status_code, 200)
                self.assertIn(
                    self.ideas[code].id,
                    {item["id"] for item in response.json()["results"]},
                )

        excluded = client.get(
            reverse("api:explore:search"),
            {"q": "Türkçe"},
        )
        self.assertEqual(excluded.status_code, 200)
        self.assertEqual(excluded.json()["results"], [])

    def test_search_explicit_languages_override_reader_default(self):
        response = self.authenticated_client().get(
            reverse("api:explore:search"),
            {"q": "Türkçe", "languages": "tr"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [item["id"] for item in response.json()["results"]],
            [self.ideas["tr"].id],
        )

    def test_legacy_single_search_language_alias_remains_supported(self):
        response = self.authenticated_client().get(
            reverse("api:explore:search"),
            {"language": "tr"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.page_languages(response), {"tr"})

    def test_topic_browsing_respects_reader_languages_and_explicit_override(self):
        url = reverse("api:explore:topic-ideas", args=[self.topic.slug])
        client = self.authenticated_client()

        default_response = client.get(url)
        self.assertEqual(default_response.status_code, 200)
        self.assertEqual(
            self.page_languages(default_response),
            set(self.SELECTED_CODES),
        )

        override = client.get(url, {"languages": "tr"})
        self.assertEqual(override.status_code, 200)
        self.assertEqual(self.page_languages(override), {"tr"})

    def test_recommendation_candidates_filter_before_scoring(self):
        candidates = recommendation_candidates(
            language_codes=self.SELECTED_CODES,
        )

        self.assertTrue(candidates)
        self.assertTrue(
            {idea.language for idea in candidates}.issubset(
                set(self.SELECTED_CODES)
            )
        )
        self.assertNotIn(self.ideas["tr"].id, {idea.id for idea in candidates})
        self.assertNotIn(self.ideas["ru"].id, {idea.id for idea in candidates})

    def test_recommendations_default_to_stored_languages_and_allow_override(self):
        client = self.authenticated_client()
        url = reverse("api:recommendations:recommendations")

        default_response = client.get(url)
        self.assertEqual(default_response.status_code, 200)
        self.assertTrue(
            {item["idea"]["language"] for item in default_response.json()}
            .issubset(set(self.SELECTED_CODES))
        )

        override = client.get(url, {"languages": "tr"})
        self.assertEqual(override.status_code, 200)
        self.assertEqual(
            {item["idea"]["language"] for item in override.json()},
            {"tr"},
        )

    def test_related_ideas_respect_authenticated_languages_but_anonymous_sees_all(self):
        url = reverse(
            "api:recommendations:idea-related",
            args=[self.ideas["en"].id],
        )

        authenticated = self.authenticated_client().get(url)
        self.assertEqual(authenticated.status_code, 200)
        authenticated_languages = {
            item["idea"]["language"] for item in authenticated.json()
        }
        self.assertTrue(
            authenticated_languages.issubset(set(self.SELECTED_CODES))
        )
        self.assertNotIn("tr", authenticated_languages)
        self.assertNotIn("ru", authenticated_languages)

        anonymous = APIClient().get(url)
        self.assertEqual(anonymous.status_code, 200)
        anonymous_languages = {
            item["idea"]["language"] for item in anonymous.json()
        }
        self.assertIn("tr", anonymous_languages)
        self.assertIn("ru", anonymous_languages)

    def test_related_ideas_accept_explicit_language_override(self):
        url = reverse(
            "api:recommendations:idea-related",
            args=[self.ideas["en"].id],
        )
        response = self.authenticated_client().get(
            url,
            {"languages": "tr"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            {item["idea"]["language"] for item in response.json()},
            {"tr"},
        )

    def test_saved_excluded_language_remains_in_library(self):
        SavedIdea.objects.create(user=self.reader, idea=self.ideas["tr"])

        response = self.authenticated_client().get(
            reverse("api:library:saved")
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn(
            self.ideas["tr"].id,
            {item["idea"]["id"] for item in response.json()},
        )

    def test_direct_excluded_language_idea_remains_publicly_readable(self):
        response = self.authenticated_client().get(
            reverse("api:idea-detail", args=[self.ideas["tr"].id])
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["language"], "tr")

    def test_authenticated_public_idea_list_is_discovery_filtered(self):
        response = self.authenticated_client().get(reverse("api:idea-list"))

        self.assertEqual(response.status_code, 200)
        self.assertTrue(
            {item["language"] for item in response.json()}
            .issubset(set(self.SELECTED_CODES))
        )
        self.assertNotIn(
            self.ideas["tr"].id,
            {item["id"] for item in response.json()},
        )
