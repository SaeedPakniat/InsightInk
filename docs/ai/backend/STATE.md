# Backend State

- BE-011 status: Complete.
- BE-011 starting SHA: `d6ceefb1f1880cd97987d43fe8cc2030b4fad717` (`master`, accepted and pushed BE-010).
- Q-003 is resolved and locked: Django/DRF session-cookie authentication, preferred same-origin frontend/API deployment, secure HttpOnly production session cookie, and CSRF protection retained. HTTP authentication behavior remains deferred to BE-012.
- Canonical identity: `accounts.User` still extends `AbstractUser`; `username` is removed, `email` is required and unique, `USERNAME_FIELD = "email"`, and `REQUIRED_FIELDS = []`.
- User manager: the dedicated email-based manager requires and normalizes email, hashes passwords with `set_password`, creates ordinary users without staff/superuser privileges, and validates both required superuser flags.
- Admin compatibility: custom creation/change forms and `CustomUserAdmin` use email as identity; fieldsets, add fieldsets, list display, search, and ordering do not reference `username`.
- Account/capability model remains unchanged: a Reader is a normal User, a Creator is a User with an optional CreatorProfile, Moderator capabilities will use bounded Django groups/permissions/staff behavior, and Admin maps to superuser authority. No generic role field exists.
- Migration: `accounts.0002_alter_user_managers_remove_user_username_and_more` changes the manager state, removes `username`, and makes email required/unique. It is applied to the existing local PostgreSQL database; no users or CreatorProfiles existed before application.
- Canonical future routes: `POST /api/v1/auth/register/`, `POST /api/v1/auth/login/`, `POST /api/v1/auth/logout/`, and `GET /api/v1/me/`. None is implemented in BE-011.
- Public API regression: anonymous health, Topic, Source, and published-Idea list/detail behavior remains unchanged.
- Validation: all 63 backend tests pass; Django checks, migration drift, applied account migration history, dependency health, and runtime email-identity assertions pass.
- Excluded: auth endpoints, SessionAuthentication configuration, JWT/token/OAuth packages, CORS changes, CSRF exemptions, password reset, email verification, MFA, roles/permissions, and frontend work.
- Known issues: none in BE-011.
- Next logical task: BE-012 Session Authentication API only.
