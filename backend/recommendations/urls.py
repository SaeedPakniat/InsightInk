from django.urls import path

from .views import RecommendationView, RelatedIdeasView


app_name = "recommendations"

urlpatterns = [
    path("recommendations/", RecommendationView.as_view(), name="recommendations"),
    path(
        "ideas/<int:idea_id>/related/",
        RelatedIdeasView.as_view(),
        name="idea-related",
    ),
]
