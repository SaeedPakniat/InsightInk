# Backend State

- BE-002 status: Complete.
- Django project: `backend/` with configuration package `backend/config/`.
- Custom User: `backend/accounts/models.py` (`accounts.User`), based on Django's `AbstractUser`.
- Core additions: `display_name` and Persian/English `preferred_ui_language`; Django's built-in authentication and password machinery remain intact.
- Authentication setting: `AUTH_USER_MODEL = "accounts.User"`.
- Admin: The custom User is registered with Django's `UserAdmin` infrastructure.
- Migration: `backend/accounts/migrations/0001_initial.py` created and verified; migrations have not been applied.
- Validation: Django system checks, the focused accounts test, Custom User shell resolution, migration drift check, and Git whitespace check pass.
- Virtual environment: Simple stale `InkSight` paths were repaired in the Bash, csh, and fish activation scripts; activation now resolves Python 3.14.9 and Django 5.2.18 from the repository `.venv`.
- Next milestone: Configure the documented project database and apply the first migration set with the Custom User established.
