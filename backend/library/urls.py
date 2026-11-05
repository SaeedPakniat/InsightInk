from django.urls import path

from .views import SavedLibraryView


app_name = "library"

urlpatterns = [
    path("library/saved/", SavedLibraryView.as_view(), name="saved"),
]
