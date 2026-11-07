from django.contrib.auth import get_user_model
from django.test import SimpleTestCase, TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from content.models import Idea, Source, Topic
from creators.models import CreatorProfile

from .normalization import normalize_search_text


class SearchNormalizationTests(SimpleTestCase):
    def test_normalizes_arabic_yeh_kaf_and_alef_maqsura(self):
        self.assertEqual(
            normalize_search_text("كتاب يادگيرى"),
            "کتاب یادگیری",
        )

    def test_normalizes_zwnj_and_repeated_whitespace(self):
        self.assertEqual(
            normalize_search_text("کتاب\u200cهای   خوب"),
            "کتاب های خوب",
        )

    def test_english_normalization_is_casefolded(self):
        self.assertEqual(normalize_search_text("  Deep WORK  "), "deep work")


class ExploreSearchAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        creator_user = get_user_model().objects.create_user(
            email="explore-creator@example.com",
            display_name="Mindful Creator",
        )
        self.creator = CreatorProfile.objects.create(user=creator_user)

        self.book_source = Source.objects.create(
            type=Source.SourceType.BOOK,
            title="Atomic Habits",
            original_creator_text="James Clear",
            language="en",
        )
        self.article_source = Source.objects.create(
            type=Source.SourceType.ARTICLE,
            title="مقاله یادگیری",
            original_creator_text="نویسنده فارسی",
            language="fa",
        )

        self.science = Topic.objects.create(
            slug="science",
            name_fa="علم",
            name_en="Science",
        )
        self.learning = Topic.objects.create(
            slug="learning",
            name_fa="یادگیری",
            name_en="Learning",
        )
        self.inactive_topic = Topic.objects.create(
            slug="inactive-topic",
            name_fa="غیرفعال",
            name_en="Inactive",
            is_active=False,
        )

        self.english = self.create_idea(
            source=self.book_source,
            language="en",
            title="Deep Work and Focus",
            body="Build concentration with deliberate practice.",
            status=Idea.IdeaStatus.PUBLISHED,
            topics=[self.science],
        )
        self.persian = self.create_idea(
            source=self.article_source,
            language="fa",
            title="کتاب\u200cهای خوب برای یادگیری",
            body="تمرکز و یادگیری عمیق",
            status=Idea.IdeaStatus.PUBLISHED,
            topics=[self.learning],
        )
        self.arabic_variant_stored = self.create_idea(
            source=self.article_source,
            language="fa",
            title="كتاب يادگيرى",
            body="متن با حروف عربي",
            status=Idea.IdeaStatus.PUBLISHED,
            topics=[self.learning],
        )
        self.draft = self.create_idea(
            source=self.book_source,
            language="en",
            title="Secret Focus Draft",
            body="Should never appear in search.",
            status=Idea.IdeaStatus.DRAFT,
            topics=[self.science],
        )
        self.hidden = self.create_idea(
            source=self.book_source,
            language="en",
            title="Hidden Focus",
            body="Should never appear either.",
            status=Idea.IdeaStatus.HIDDEN,
            topics=[self.science],
        )
        self.search_url = reverse("api:explore:search")

    def create_idea(self, *, source, language, title, body, status, topics):
        idea = Idea.objects.create(
            creator=self.creator,
            source=source,
            language=language,
            title=title,
            body=body,
            estimated_read_seconds=60,
            status=status,
        )
        idea.topics.set(topics)
        return idea

    def result_ids(self, response):
        return [item["id"] for item in response.json()["results"]]

    def test_search_is_anonymous_cursor_paginated_and_published_only(self):
        response = self.client.get(self.search_url, {"q": "focus"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(set(response.json()), {"next", "previous", "results"})
        self.assertEqual(self.result_ids(response), [self.english.id])
        self.assertNotIn(self.draft.id, self.result_ids(response))
        self.assertNotIn(self.hidden.id, self.result_ids(response))

    def test_english_search_is_case_insensitive(self):
        response = self.client.get(self.search_url, {"q": "DEEP WORK"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.result_ids(response), [self.english.id])

    def test_persian_query_matches_zwnj_with_normal_space(self):
        response = self.client.get(
            self.search_url,
            {"q": "کتاب های خوب"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn(self.persian.id, self.result_ids(response))

    def test_arabic_query_variants_match_persian_stored_text(self):
        response = self.client.get(
            self.search_url,
            {"q": "كتاب هاى خوب براى يادگيرى"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn(self.persian.id, self.result_ids(response))

    def test_persian_query_matches_arabic_variant_stored_text(self):
        response = self.client.get(
            self.search_url,
            {"q": "کتاب یادگیری"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn(self.arabic_variant_stored.id, self.result_ids(response))

    def test_search_does_not_rewrite_stored_original_text(self):
        original = self.arabic_variant_stored.title

        response = self.client.get(self.search_url, {"q": "کتاب یادگیری"})

        self.assertEqual(response.status_code, 200)
        self.arabic_variant_stored.refresh_from_db()
        self.assertEqual(self.arabic_variant_stored.title, original)

    def test_search_matches_source_title(self):
        response = self.client.get(self.search_url, {"q": "atomic"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.result_ids(response), [self.english.id])

    def test_search_matches_source_original_creator_text(self):
        response = self.client.get(self.search_url, {"q": "JAMES CLEAR"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.result_ids(response), [self.english.id])

    def test_search_matches_creator_display_name(self):
        response = self.client.get(self.search_url, {"q": "mindful"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            set(self.result_ids(response)),
            {self.english.id, self.persian.id, self.arabic_variant_stored.id},
        )

    def test_search_matches_topic_names_in_both_languages(self):
        english_topic = self.client.get(self.search_url, {"q": "science"})
        persian_topic = self.client.get(self.search_url, {"q": "یادگیری"})

        self.assertEqual(english_topic.status_code, 200)
        self.assertEqual(self.result_ids(english_topic), [self.english.id])
        self.assertEqual(persian_topic.status_code, 200)
        self.assertEqual(
            set(self.result_ids(persian_topic)),
            {self.persian.id, self.arabic_variant_stored.id},
        )

    def test_language_filter_supports_persian_and_english(self):
        english = self.client.get(self.search_url, {"language": "en"})
        persian = self.client.get(self.search_url, {"language": "fa"})

        self.assertEqual(english.status_code, 200)
        self.assertEqual(self.result_ids(english), [self.english.id])
        self.assertEqual(persian.status_code, 200)
        self.assertEqual(
            set(self.result_ids(persian)),
            {self.persian.id, self.arabic_variant_stored.id},
        )

    def test_source_type_filter(self):
        books = self.client.get(self.search_url, {"type": "book"})
        articles = self.client.get(self.search_url, {"type": "article"})

        self.assertEqual(books.status_code, 200)
        self.assertEqual(self.result_ids(books), [self.english.id])
        self.assertEqual(articles.status_code, 200)
        self.assertEqual(
            set(self.result_ids(articles)),
            {self.persian.id, self.arabic_variant_stored.id},
        )

    def test_topic_slug_filter_requires_active_topic_relation(self):
        response = self.client.get(self.search_url, {"topic": "learning"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            set(self.result_ids(response)),
            {self.persian.id, self.arabic_variant_stored.id},
        )

        inactive = self.client.get(
            self.search_url,
            {"topic": self.inactive_topic.slug},
        )
        self.assertEqual(inactive.status_code, 200)
        self.assertEqual(inactive.json()["results"], [])

    def test_query_and_filters_compose(self):
        response = self.client.get(
            self.search_url,
            {
                "q": "یادگیری",
                "language": "fa",
                "type": "article",
                "topic": "learning",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            set(self.result_ids(response)),
            {self.persian.id, self.arabic_variant_stored.id},
        )

    def test_search_without_query_is_explore_all_published(self):
        response = self.client.get(self.search_url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            set(self.result_ids(response)),
            {self.english.id, self.persian.id, self.arabic_variant_stored.id},
        )

    def test_invalid_language_and_type_are_validation_errors(self):
        bad_language = self.client.get(
            self.search_url,
            {"language": "abcxyz"},
        )
        bad_type = self.client.get(self.search_url, {"type": "livestream"})

        self.assertEqual(bad_language.status_code, 400)
        self.assertIn("languages", bad_language.json())
        self.assertEqual(bad_type.status_code, 400)
        self.assertIn("type", bad_type.json())

    def test_search_query_length_is_bounded(self):
        response = self.client.get(self.search_url, {"q": "x" * 201})

        self.assertEqual(response.status_code, 400)
        self.assertIn("q", response.json())

    def test_search_rejects_writes(self):
        for method in ("post", "put", "patch", "delete"):
            with self.subTest(method=method):
                response = getattr(self.client, method)(
                    self.search_url,
                    data={"q": "focus"},
                )
                self.assertEqual(response.status_code, 405)


class TopicBrowseAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        creator_user = get_user_model().objects.create_user(
            email="topic-browse-creator@example.com"
        )
        self.creator = CreatorProfile.objects.create(user=creator_user)
        self.source = Source.objects.create(
            type=Source.SourceType.PODCAST,
            title="Topic Source",
            language="fa",
        )
        self.active_topic = Topic.objects.create(
            slug="focus",
            name_fa="تمرکز",
            name_en="Focus",
        )
        self.inactive_topic = Topic.objects.create(
            slug="old-focus",
            name_fa="قدیمی",
            name_en="Old",
            is_active=False,
        )
        self.published = self.create_idea(Idea.IdeaStatus.PUBLISHED)
        self.draft = self.create_idea(Idea.IdeaStatus.DRAFT)
        self.hidden = self.create_idea(Idea.IdeaStatus.HIDDEN)
        for idea in (self.published, self.draft, self.hidden):
            idea.topics.add(self.active_topic)

    def create_idea(self, status):
        return Idea.objects.create(
            creator=self.creator,
            source=self.source,
            language="fa",
            title=f"{status} topic idea",
            body="Topic body",
            estimated_read_seconds=45,
            status=status,
        )

    def test_active_topic_ideas_is_public_paginated_and_published_only(self):
        response = self.client.get(
            reverse("api:explore:topic-ideas", args=[self.active_topic.slug])
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(set(response.json()), {"next", "previous", "results"})
        self.assertEqual(
            [item["id"] for item in response.json()["results"]],
            [self.published.id],
        )

    def test_inactive_or_missing_topic_returns_404(self):
        inactive = self.client.get(
            reverse("api:explore:topic-ideas", args=[self.inactive_topic.slug])
        )
        missing = self.client.get(
            reverse("api:explore:topic-ideas", args=["missing-topic"])
        )

        self.assertEqual(inactive.status_code, 404)
        self.assertEqual(missing.status_code, 404)

    def test_topic_browse_rejects_writes(self):
        url = reverse("api:explore:topic-ideas", args=[self.active_topic.slug])
        response = self.client.post(url, data={})

        self.assertEqual(response.status_code, 405)
