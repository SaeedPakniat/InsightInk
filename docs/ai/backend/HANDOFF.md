# Backend Handoff

- Task ID: BE-011
- Exact base SHA: `d6ceefb1f1880cd97987d43fe8cc2030b4fad717`
- Result: Complete. Aligned the existing `accounts.User` schema and admin with the locked email identity while retaining `AbstractUser`; no HTTP authentication behavior was implemented.
- Q-003: locked to Django/DRF session-cookie authentication, preferred same-origin frontend/API deployment, secure HttpOnly production session cookie, and CSRF protection retained. JWT, DRF token authentication, custom bearer/refresh tokens, and OAuth/social authentication are excluded absent a future demonstrated need and decision.
- Identity contract: required unique `email`, no `username` model field, `USERNAME_FIELD = "email"`, and `REQUIRED_FIELDS = []`. Existing `display_name` and `preferred_ui_language` remain unchanged.
- Manager: `accounts.managers.UserManager` normalizes required email addresses, hashes passwords through `set_password`, keeps ordinary users non-staff/non-superuser, and validates `is_staff=True` plus `is_superuser=True` for superusers.
- Admin: dedicated creation/change forms target the custom User. UserAdmin fieldsets, add form, list display, search, and ordering use email and never reference the removed username field.
- Data safety: immediately before migration, PostgreSQL contained 0 Users, 0 blank/null emails, 0 duplicate-email groups, and 0 CreatorProfiles. No users were deleted, reset, or assigned manufactured identities.
- Migration: `accounts.0002_alter_user_managers_remove_user_username_and_more` changes the manager state, removes `username`, and makes `email` required/unique. It applied successfully to the existing PostgreSQL development database. CreatorProfile and content schema were not changed.
- Tests/checks: all 63 backend tests pass, including manager, password hashing, uniqueness, normalization, superuser validation, project fields, admin compatibility, CreatorProfile relationships, and anonymous public API regressions. `manage.py check`, migration drift, `showmigrations accounts`, `pip check`, and runtime model assertions pass.
- Deferred routes for BE-012: `POST /api/v1/auth/register/`, `POST /api/v1/auth/login/`, `POST /api/v1/auth/logout/`, and `GET /api/v1/me/`. BE-011 adds none of them and does not configure SessionAuthentication.
- Files changed: `backend/accounts/models.py`; `backend/accounts/managers.py`; `backend/accounts/forms.py`; `backend/accounts/admin.py`; `backend/accounts/tests.py`; `backend/accounts/migrations/0002_alter_user_managers_remove_user_username_and_more.py`; `backend/creators/tests.py`; `backend/content/tests.py`; `docs/05-api-auth-and-roles.md`; `docs/13-decisions-and-open-questions.md`; `docs/latex/chapters/10-api-auth-roles.tex`; `docs/ai/backend/STATE.md`; `docs/ai/backend/HANDOFF.md`.
- Known issues: none.
- Next logical task: BE-012 Session Authentication API only; do not pull role/ownership authorization or later account-security features into it.
