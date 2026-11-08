from django.urls import path

from .views import (
    CsrfTokenView,
    CurrentUserAvatarView,
    CurrentUserView,
    LoginView,
    LogoutView,
    RegisterView,
    UserContentLanguagesView,
    UserInterestsView,
)


app_name = "accounts"

urlpatterns = [
    path("auth/csrf/", CsrfTokenView.as_view(), name="csrf"),
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("auth/login/", LoginView.as_view(), name="login"),
    path("auth/logout/", LogoutView.as_view(), name="logout"),
    path("me/", CurrentUserView.as_view(), name="me"),
    path("me/avatar/", CurrentUserAvatarView.as_view(), name="me-avatar"),
    path("me/interests/", UserInterestsView.as_view(), name="me-interests"),
    path("me/languages/", UserContentLanguagesView.as_view(), name="me-languages"),
]
