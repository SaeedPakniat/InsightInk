from django.db.models import Exists, OuterRef

from content.models import Idea

from .models import SavedIdea, Spark


def viewer_engagement_state(*, user, idea_ids):
    spark_exists = Spark.objects.filter(
        user=user,
        idea_id=OuterRef("pk"),
    )
    saved_exists = SavedIdea.objects.filter(
        user=user,
        idea_id=OuterRef("pk"),
    )

    rows = (
        Idea.objects.filter(
            pk__in=idea_ids,
            status=Idea.IdeaStatus.PUBLISHED,
        )
        .annotate(
            viewer_sparked=Exists(spark_exists),
            viewer_saved=Exists(saved_exists),
        )
        .values("id", "viewer_sparked", "viewer_saved")
    )

    by_id = {
        row["id"]: {
            "idea_id": row["id"],
            "sparked": row["viewer_sparked"],
            "saved": row["viewer_saved"],
        }
        for row in rows
    }
    return [by_id[idea_id] for idea_id in idea_ids if idea_id in by_id]
