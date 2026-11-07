from django.conf import settings
from django.db import models

from creators.models import CreatorProfile

from .validators import validate_active_content_language



class ContentLanguage(models.Model):
    code = models.CharField(max_length=35, primary_key=True)
    name_en = models.CharField(max_length=160)
    name_fa = models.CharField(max_length=160)
    native_name = models.CharField(max_length=160, blank=True)
    is_active = models.BooleanField(default=True, db_index=True)
    display_order = models.PositiveSmallIntegerField(default=0, db_index=True)

    class Meta:
        ordering = ("display_order", "code")

    def __str__(self):
        return self.native_name or self.name_en


class Topic(models.Model):
    slug = models.SlugField(max_length=80, unique=True)
    name_fa = models.CharField(max_length=160)
    name_en = models.CharField(max_length=160)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name_en


class Source(models.Model):
    class SourceType(models.TextChoices):
        BOOK = "book", "Book"
        ARTICLE = "article", "Article"
        PAPER = "paper", "Paper"
        WEBSITE = "website", "Website"
        VIDEO = "video", "Video"
        PODCAST = "podcast", "Podcast"
        MOVIE = "movie", "Movie"
        COURSE = "course", "Course"
        OTHER = "other", "Other"

    type = models.CharField(
        max_length=20,
        choices=SourceType.choices,
        db_index=True,
    )
    title = models.CharField(max_length=255)
    original_creator_text = models.CharField(max_length=255, blank=True)
    language = models.CharField(
        max_length=35,
        validators=[validate_active_content_language],
    )
    external_url = models.URLField(max_length=500, blank=True)
    cover = models.URLField(max_length=500, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="created_sources",
    )

    def __str__(self):
        return self.title


class Idea(models.Model):
    class IdeaStatus(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"
        HIDDEN = "hidden", "Hidden"
        WITHDRAWN = "withdrawn", "Withdrawn"

    creator = models.ForeignKey(
        CreatorProfile,
        on_delete=models.PROTECT,
        related_name="ideas",
    )
    source = models.ForeignKey(
        Source,
        on_delete=models.PROTECT,
        related_name="ideas",
    )
    language = models.CharField(
        max_length=35,
        db_index=True,
        validators=[validate_active_content_language],
    )
    title = models.CharField(max_length=255)
    body = models.TextField()
    estimated_read_seconds = models.PositiveIntegerField()
    status = models.CharField(
        max_length=20,
        choices=IdeaStatus.choices,
        default=IdeaStatus.DRAFT,
        db_index=True,
    )
    published_at = models.DateTimeField(null=True, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    topics = models.ManyToManyField(Topic, related_name="ideas", blank=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=models.Q(estimated_read_seconds__gt=0),
                name="content_idea_estimated_read_seconds_gt_0",
            ),
        ]

    def __str__(self):
        return self.title
