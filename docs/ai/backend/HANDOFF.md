# Backend Handoff

- Task ID: BE-012
- Exact base SHA: `3c53e16b09fc1c7d5c2a8fb78cfd8ccdc3d6538c`
- Result: Complete. Implemented the initial Django/DRF session-authentication API without model changes, migrations, token authentication, CORS, or authorization work.
- Auth configuration: DRF's sole global authentication class is `SessionAuthentication`; no global permission class was added. `SESSION_COOKIE_HTTPONLY` is explicitly true, local development retains the default non-secure cookie setting, and Django's default SameSite protection remains intact.
- API contract: `GET /api/v1/auth/csrf/` returns `{ "csrfToken": "<token>" }`; registration returns 201 plus the safe user representation; login returns 200 plus the same representation; authenticated logout returns 204; authenticated `/api/v1/me/` returns exactly `id`, `email`, `display_name`, and `preferred_ui_language`.
- CSRF behavior: the bootstrap response supplies both a usable masked token and CSRF cookie. Django's real `CsrfViewMiddleware` explicitly protects registration, login, and logout. Missing-CSRF registration/login/logout requests are proven to return 403; CSRF is not disabled or exempted.
- Registration behavior: email/password are required; existing optional display name and preferred-language semantics are preserved; Django password validators run before persistence; duplicate email is a normal validation error; the custom User manager hashes the password and creates no username; successful registration logs in the new user.
- Login behavior: Django's configured authentication backend receives normalized email plus password. Wrong-password and nonexistent-email attempts return the same generic response. Successful login creates an authenticated session and rotates an existing anonymous session identifier.
- Logout/session lifecycle: Django logout deletes the server-side session and expires the session cookie; a subsequent `/api/v1/me/` request is rejected.
- Public API regression: anonymous health, Topic list/detail, Source list/detail, and published-Idea list/detail behavior remains passing under explicit `AllowAny` permissions.
- Tests/checks: 31 focused account tests and all 81 backend tests pass against PostgreSQL. `manage.py check`, `manage.py makemigrations --check --dry-run` (`No changes detected`), `python -m pip check`, and `git diff --check` pass.
- Files changed: `backend/accounts/serializers.py`; `backend/accounts/views.py`; `backend/accounts/urls.py`; `backend/accounts/tests.py`; `backend/api/urls.py`; `backend/config/settings.py`; `docs/ai/backend/STATE.md`; `docs/ai/backend/HANDOFF.md`.
- Database/migrations: no model change, no generated migration, and no schema migration applied. Normal use of Django's existing session table is expected.
- Known issues: none.
- Next logical task: BE-013 authorization foundation only; do not add role/ownership permissions as part of BE-012.
