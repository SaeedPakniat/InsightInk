# Backend State

- BE-003 status: Complete.
- Django project: `backend/` with configuration package `backend/config/`.
- Custom User: `backend/accounts/models.py` (`accounts.User`), based on Django's `AbstractUser`.
- Core additions: `display_name` and Persian/English `preferred_ui_language`; Django's built-in authentication and password machinery remain intact.
- Authentication setting: `AUTH_USER_MODEL = "accounts.User"`.
- Admin: The custom User is registered with Django's `UserAdmin` infrastructure.
- Active database engine: PostgreSQL 18.6, using local database `insightink_dev` at `127.0.0.1:5432` and non-superuser development role `insightink_app`.
- PostgreSQL development configuration approach: `backend/config/settings.py` strictly reads `DATABASE_NAME`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_HOST`, and `DATABASE_PORT`; there is no SQLite fallback. Non-secret example values are in `.env.example`, while the real local password remains only in the Git-ignored `.env`.
- PostgreSQL driver: Psycopg 3.3.6 with its binary extra, reproducibly recorded alongside Django 5.2.18 in `requirements.txt`.
- Migration: All initial Django migrations and `accounts.0001_initial` are applied to PostgreSQL; the `accounts_user` table exists and `django_migrations` contains 19 records.
- Validation: Django system checks pass, the accounts test passes, all migrations show as applied, migration drift reports no changes, ORM/introspection confirms PostgreSQL and the Custom User table, no SQLite database file exists, and Git whitespace validation passes.
- Virtual environment: Simple stale `InkSight` paths were repaired in the Bash, csh, and fish activation scripts; activation now resolves Python 3.14.9 and Django 5.2.18 from the repository `.venv`.
- Next milestone: Continue the Django foundation with the next separately scoped backend task; do not add Phase 2 business-domain models until authorized.
