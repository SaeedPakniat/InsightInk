from collections import Counter
from datetime import datetime

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from accounts.models import UserInterest
from creators.models import CreatorFollow, CreatorProfile
from engagement.models import Comment, SavedIdea, Spark

from content.demo_seed_data import (
    DEMO_COMMENTS,
    DEMO_PASSWORD,
    DEMO_READER_FOLLOWS,
    DEMO_READER_INTERESTS,
    DEMO_READER_SAVES,
    DEMO_READER_SPARKS,
    DEMO_USERS,
    IDEAS,
    SOURCES,
    TOPICS,
)
from content.models import Idea, Source, Topic


User = get_user_model()


class Command(BaseCommand):
    help = "Create or update InsightInk's deterministic local development/demo dataset."

    @transaction.atomic
    def handle(self, *args, **options):
        stats = Counter()

        topics = self._seed_topics(stats)
        users, creators = self._seed_users_and_creators(stats)
        sources = self._seed_sources(stats)
        ideas = self._seed_ideas(stats, topics, creators, sources)
        self._seed_reader_activity(stats, topics, users, creators, ideas)

        self.stdout.write(self.style.SUCCESS("InsightInk demo dataset is ready."))
        self.stdout.write(
            "Topics: {created} created / {updated} updated".format(
                created=stats["topics_created"],
                updated=stats["topics_updated"],
            )
        )
        self.stdout.write(
            "Users: {created} created / {updated} updated".format(
                created=stats["users_created"],
                updated=stats["users_updated"],
            )
        )
        self.stdout.write(
            "Creators: {created} created / {updated} updated".format(
                created=stats["creators_created"],
                updated=stats["creators_updated"],
            )
        )
        self.stdout.write(
            "Sources: {created} created / {updated} updated".format(
                created=stats["sources_created"],
                updated=stats["sources_updated"],
            )
        )
        self.stdout.write(
            "Ideas: {created} created / {updated} updated".format(
                created=stats["ideas_created"],
                updated=stats["ideas_updated"],
            )
        )
        self.stdout.write(
            "Demo activity ensured: "
            f"{stats['interests']} interests, "
            f"{stats['saves']} saves, "
            f"{stats['sparks']} sparks, "
            f"{stats['follows']} follows, "
            f"{stats['comments']} comments."
        )
        self.stdout.write(
            self.style.WARNING(
                "Development-only login: demo-reader@example.com / "
                f"{DEMO_PASSWORD}"
            )
        )
        self.stdout.write(
            self.style.WARNING(
                "All demo creator accounts use the same development-only password."
            )
        )

    def _seed_topics(self, stats):
        topics = {}
        for spec in TOPICS:
            topic, created = Topic.objects.update_or_create(
                slug=spec["slug"],
                defaults={
                    "name_fa": spec["name_fa"],
                    "name_en": spec["name_en"],
                    "is_active": True,
                },
            )
            topics[topic.slug] = topic
            stats["topics_created" if created else "topics_updated"] += 1
        return topics

    def _seed_users_and_creators(self, stats):
        users = {}
        creators = {}

        for spec in DEMO_USERS:
            user, created = User.objects.update_or_create(
                email=spec["email"],
                defaults={
                    "display_name": spec["display_name"],
                    "preferred_ui_language": spec["preferred_ui_language"],
                },
            )
            user.set_password(DEMO_PASSWORD)
            user.save(update_fields=["password"])
            users[user.email] = user
            stats["users_created" if created else "users_updated"] += 1

            if not spec["is_creator"]:
                continue

            profile, profile_created = CreatorProfile.objects.update_or_create(
                user=user,
                defaults={
                    "bio_fa": spec["bio_fa"],
                    "bio_en": spec["bio_en"],
                    "is_verified": spec["is_verified"],
                },
            )
            creators[user.email] = profile
            stats[
                "creators_created" if profile_created else "creators_updated"
            ] += 1

        return users, creators

    def _seed_sources(self, stats):
        sources = {}

        for spec in SOURCES:
            source = Source.objects.filter(
                metadata__demo_seed_key=spec["key"]
            ).first()
            defaults = {
                "type": spec["type"],
                "title": spec["title"],
                "original_creator_text": spec["original_creator_text"],
                "language": spec["language"],
                "external_url": spec["external_url"],
                "cover": "",
                "metadata": {
                    "demo_seed_key": spec["key"],
                    "provenance_url": spec["provenance_url"],
                    "provenance_note": (
                        "Metadata checked during BE-DATA-001 preparation; "
                        "runtime seeding is offline."
                    ),
                },
            }

            if source is None:
                source = Source.objects.create(**defaults)
                stats["sources_created"] += 1
            else:
                for field, value in defaults.items():
                    setattr(source, field, value)
                source.save()
                stats["sources_updated"] += 1

            sources[spec["key"]] = source

        return sources

    def _seed_ideas(self, stats, topics, creators, sources):
        ideas = {}

        for spec in IDEAS:
            creator = creators[spec["creator"]]
            source = sources[spec["source"]]
            published_at = datetime.fromisoformat(spec["published_at"])

            idea, created = Idea.objects.update_or_create(
                creator=creator,
                source=source,
                language=spec["language"],
                title=spec["title"],
                defaults={
                    "body": spec["body"],
                    "estimated_read_seconds": spec["seconds"],
                    "status": Idea.IdeaStatus.PUBLISHED,
                    "published_at": published_at,
                },
            )
            idea.topics.set([topics[slug] for slug in spec["topics"]])
            ideas[idea.title] = idea
            stats["ideas_created" if created else "ideas_updated"] += 1

        return ideas

    def _seed_reader_activity(self, stats, topics, users, creators, ideas):
        reader = users["demo-reader@example.com"]

        for slug in DEMO_READER_INTERESTS:
            _, created = UserInterest.objects.get_or_create(
                user=reader,
                topic=topics[slug],
            )
            if created:
                stats["interests"] += 1

        for title in DEMO_READER_SAVES:
            _, created = SavedIdea.objects.get_or_create(
                user=reader,
                idea=ideas[title],
            )
            if created:
                stats["saves"] += 1

        for title in DEMO_READER_SPARKS:
            _, created = Spark.objects.get_or_create(
                user=reader,
                idea=ideas[title],
            )
            if created:
                stats["sparks"] += 1

        for creator_email in DEMO_READER_FOLLOWS:
            _, created = CreatorFollow.objects.get_or_create(
                user=reader,
                creator=creators[creator_email],
            )
            if created:
                stats["follows"] += 1

        for spec in DEMO_COMMENTS:
            _, created = Comment.objects.update_or_create(
                author=reader,
                idea=ideas[spec["idea_title"]],
                body=spec["body"],
                defaults={"status": Comment.CommentStatus.VISIBLE},
            )
            if created:
                stats["comments"] += 1
