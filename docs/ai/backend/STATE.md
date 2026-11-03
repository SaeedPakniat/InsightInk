# Backend State

- BE-004 status: Complete.
- Base checkpoint: `6adade6e52d6d801c388284cf1ed38268e1035c5` (`master`, accepted/pushed BE-003).
- Django project: `backend/` with configuration package `backend/config/`.
- Custom User: `backend/accounts/models.py` (`accounts.User`), based on Django's `AbstractUser`; `AUTH_USER_MODEL = "accounts.User"`.
- Creator domain: `backend/creators/`, registered as a dedicated Django app in accordance with the documented domain boundary.
- CreatorProfile: a creator-specific capability extension with a required one-to-one relationship to `settings.AUTH_USER_MODEL`. A User may exist without a CreatorProfile, and the database uniqueness constraint permits at most one CreatorProfile per User.
- CreatorProfile fields: `id`, `user`, optional `bio_fa`, optional `bio_en`, optional `avatar`, `is_verified` defaulting to false, and automatically populated `created_at`.
- Lifecycle: deleting the related User cascades through Django to delete its CreatorProfile because the profile has no independent identity or lifecycle.
- Future content relationship: BE-005 must implement `Idea.creator -> CreatorProfile`, not a direct relationship to User.
- Deferred: Topic, Source, Idea, UserInterest, CreatorFollow, creator APIs/onboarding, authorization/RBAC, and all other content or creator workflows.
- Database: PostgreSQL 18.6 using local database `insightink_dev`; `creators.0001_initial` is applied and `creators_creatorprofile` exists with the expected unique user constraint and foreign key to `accounts_user`.
- Validation: Django system checks pass; migration drift reports no changes; all six tests pass against the PostgreSQL test database; all migrations show as applied; Git whitespace validation passes.
- Known issue: initial database-backed command attempts intermittently returned Psycopg `connection is bad: no error details available`, matching the transient symptom recorded in BE-003. PostgreSQL remained active and accepted direct Psycopg/psql connections; clean retries of migration, drift check, migration status, and the full test suite all passed.
- Next milestone: BE-005 — Core Content Models (`Topic`, `Source`, and `Idea`) with `Idea.creator` targeting `CreatorProfile`.
