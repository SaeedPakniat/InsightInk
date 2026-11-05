from django.urls import path

from .views import SearchView, TopicIdeasView


app_name = "explore"

urlpatterns = [
    path("search/", SearchView.as_view(), name="search"),
    path(
        "topics/<slug:slug>/ideas/",
        TopicIdeasView.as_view(),
        name="topic-ideas",
    ),
]
