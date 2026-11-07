from django.db import transaction
from django.utils import timezone

from content.models import Idea
from engagement.models import Comment

from .exceptions import ModerationTransitionError
from .models import ModerationAction, Report


def create_comment_report(*, reporter, comment, reason, details=""):
    return Report.objects.create(
        reporter=reporter,
        target_type=Report.TargetType.COMMENT,
        target_id=comment.id,
        reason=reason,
        details=details,
        status=Report.Status.OPEN,
    )


def create_idea_report(*, reporter, idea, reason, details=""):
    return Report.objects.create(
        reporter=reporter,
        target_type=Report.TargetType.IDEA,
        target_id=idea.id,
        reason=reason,
        details=details,
        status=Report.Status.OPEN,
    )


def _record_action(
    *,
    actor,
    report,
    action_type,
    note="",
    target_type=None,
    target_id=None,
):
    if report is None and (target_type is None or target_id is None):
        raise ValueError(
            "Direct moderation actions require explicit target_type and target_id."
        )

    return ModerationAction.objects.create(
        moderator=actor,
        report=report,
        action_type=action_type,
        target_type=target_type if target_type is not None else report.target_type,
        target_id=target_id if target_id is not None else report.target_id,
        note=note,
    )


@transaction.atomic
def start_review(*, actor, report_id, note=""):
    report = Report.objects.select_for_update().get(pk=report_id)
    if report.status != Report.Status.OPEN:
        raise ModerationTransitionError("Only open reports can enter review.")

    report.status = Report.Status.REVIEWING
    report.save(update_fields=["status"])
    _record_action(
        actor=actor,
        report=report,
        action_type=ModerationAction.ActionType.REVIEW_STARTED,
        note=note,
    )
    return report


@transaction.atomic
def hide_reported_comment(*, actor, report_id, note=""):
    report = Report.objects.select_for_update().get(pk=report_id)
    if report.status != Report.Status.REVIEWING:
        raise ModerationTransitionError(
            "A report must be reviewing before its comment can be hidden."
        )
    if report.target_type != Report.TargetType.COMMENT:
        raise ModerationTransitionError("This moderation action requires a comment report.")

    try:
        comment = Comment.objects.select_for_update().get(pk=report.target_id)
    except Comment.DoesNotExist as exc:
        raise ModerationTransitionError("The reported comment no longer exists.") from exc

    if comment.status == Comment.CommentStatus.HIDDEN:
        raise ModerationTransitionError("The reported comment is already hidden.")
    if comment.status == Comment.CommentStatus.DELETED:
        raise ModerationTransitionError("A deleted comment cannot be hidden.")

    comment.status = Comment.CommentStatus.HIDDEN
    comment.save(update_fields=["status", "updated_at"])
    _record_action(
        actor=actor,
        report=report,
        action_type=ModerationAction.ActionType.COMMENT_HIDDEN,
        note=note,
        target_type=Report.TargetType.COMMENT,
        target_id=comment.id,
    )
    return comment


def _finish_report(*, actor, report_id, status, action_type, note=""):
    with transaction.atomic():
        report = Report.objects.select_for_update().get(pk=report_id)
        if report.status != Report.Status.REVIEWING:
            raise ModerationTransitionError(
                "Only reviewing reports can be completed."
            )

        report.status = status
        report.resolved_at = timezone.now()
        report.save(update_fields=["status", "resolved_at"])
        _record_action(
            actor=actor,
            report=report,
            action_type=action_type,
            note=note,
        )
        return report


def resolve_report(*, actor, report_id, note=""):
    return _finish_report(
        actor=actor,
        report_id=report_id,
        status=Report.Status.RESOLVED,
        action_type=ModerationAction.ActionType.REPORT_RESOLVED,
        note=note,
    )


def reject_report(*, actor, report_id, note=""):
    return _finish_report(
        actor=actor,
        report_id=report_id,
        status=Report.Status.REJECTED,
        action_type=ModerationAction.ActionType.REPORT_REJECTED,
        note=note,
    )


@transaction.atomic
def hide_idea_directly(*, actor, idea_id, note=""):
    idea = Idea.objects.select_for_update().get(pk=idea_id)
    if idea.status != Idea.IdeaStatus.PUBLISHED:
        raise ModerationTransitionError(
            "Only published ideas can be hidden."
        )

    idea.status = Idea.IdeaStatus.HIDDEN
    idea.save(update_fields=["status", "updated_at"])
    _record_action(
        actor=actor,
        report=None,
        action_type=ModerationAction.ActionType.IDEA_HIDDEN,
        note=note,
        target_type=Report.TargetType.IDEA,
        target_id=idea.id,
    )
    return idea


@transaction.atomic
def restore_idea_directly(*, actor, idea_id, note=""):
    idea = Idea.objects.select_for_update().get(pk=idea_id)
    if idea.status != Idea.IdeaStatus.HIDDEN:
        raise ModerationTransitionError(
            "Only hidden ideas can be restored."
        )

    idea.status = Idea.IdeaStatus.PUBLISHED
    idea.save(update_fields=["status", "updated_at"])
    _record_action(
        actor=actor,
        report=None,
        action_type=ModerationAction.ActionType.IDEA_RESTORED,
        note=note,
        target_type=Report.TargetType.IDEA,
        target_id=idea.id,
    )
    return idea
