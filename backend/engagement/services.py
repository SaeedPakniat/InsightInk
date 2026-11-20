from django.db import transaction

from notifications.services import create_comment_received_notification

from .models import Comment


@transaction.atomic
def create_comment(*, author, idea, body):
    comment = Comment.objects.create(
        author=author,
        idea=idea,
        body=body,
        status=Comment.CommentStatus.VISIBLE,
    )
    create_comment_received_notification(comment=comment)
    return comment
