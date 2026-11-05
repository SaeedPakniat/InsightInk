from django.conf import settings
from django.db import models


class Report(models.Model):
    class TargetType(models.TextChoices):
        COMMENT = "comment", "Comment"
        USER = "user", "User"
        IDEA = "idea", "Idea"
        MESSAGE = "message", "Message"

    class Reason(models.TextChoices):
        HARASSMENT = "harassment", "Harassment"
        SPAM = "spam", "Spam"
        INAPPROPRIATE_CONTENT = "inappropriate_content", "Inappropriate content"
        OTHER = "other", "Other"

    class Status(models.TextChoices):
        OPEN = "open", "Open"
        REVIEWING = "reviewing", "Reviewing"
        RESOLVED = "resolved", "Resolved"
        REJECTED = "rejected", "Rejected"

    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="reports_submitted",
    )
    target_type = models.CharField(
        max_length=20,
        choices=TargetType.choices,
        db_index=True,
    )
    target_id = models.PositiveBigIntegerField(db_index=True)
    reason = models.CharField(max_length=40, choices=Reason.choices)
    details = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.OPEN,
        db_index=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)


class ModerationAction(models.Model):
    class ActionType(models.TextChoices):
        REVIEW_STARTED = "review_started", "Review started"
        COMMENT_HIDDEN = "comment_hidden", "Comment hidden"
        REPORT_RESOLVED = "report_resolved", "Report resolved"
        REPORT_REJECTED = "report_rejected", "Report rejected"

    moderator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="moderation_actions",
    )
    report = models.ForeignKey(
        Report,
        on_delete=models.PROTECT,
        related_name="actions",
        null=True,
        blank=True,
    )
    action_type = models.CharField(max_length=40, choices=ActionType.choices)
    target_type = models.CharField(
        max_length=20,
        choices=Report.TargetType.choices,
    )
    target_id = models.PositiveBigIntegerField()
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
