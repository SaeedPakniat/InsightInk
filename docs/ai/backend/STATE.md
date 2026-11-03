# Backend State

- BE-012 status: Complete.
- BE-012 starting SHA: `3c53e16b09fc1c7d5c2a8fb78cfd8ccdc3d6538c` (`master`, equal to `origin/master`, accepted BE-011 plus Q-003 documentation alignment; clean starting worktree).
- Authentication configuration: DRF globally uses only `SessionAuthentication`; there is no global authenticated permission, so endpoint permissions remain explicit.
- Session security: Django's normal session login/logout lifecycle is used, session identifiers rotate on login, `SESSION_COOKIE_HTTPONLY` is explicitly true, local HTTP development does not force `SESSION_COOKIE_SECURE`, and default SameSite behavior is unchanged.
- CSRF bootstrap: `GET /api/v1/auth/csrf/` returns only `csrfToken` and establishes/refreshes the Django CSRF cookie.
- CSRF enforcement: Django `CsrfViewMiddleware` remains enabled and explicitly protects anonymous registration/login as well as authenticated logout. Requests without a valid CSRF token are rejected with 403; no CSRF exemption or global weakening exists.
- Registration: `POST /api/v1/auth/register/` accepts required email/password plus optional `display_name` and `preferred_ui_language`, validates passwords with Django validators, creates through the custom User manager, returns only safe current-user fields with 201, and establishes an authenticated session.
- Login/logout: `POST /api/v1/auth/login/` uses Django `authenticate` and `login` with generic invalid-credential behavior; `POST /api/v1/auth/logout/` requires authentication plus CSRF and uses Django `logout`, returning 204.
- Current user: authenticated `GET /api/v1/me/` returns exactly `id`, `email`, `display_name`, and `preferred_ui_language`.
- Public API regression: anonymous health, Topic list/detail, Source list/detail, and published-Idea list/detail remain public through explicit `AllowAny` permissions.
- Database/migrations: no project model changes and no new migration; migration drift reports `No changes detected`. Existing Django session-table usage is unchanged.
- Validation: all 81 backend tests pass; Django checks, dependency health, migration drift, and focused CSRF/session/security regression tests pass.
- Excluded: JWT/token/OAuth, CORS infrastructure, password reset, email verification, MFA, remember-me, roles/ownership permissions, content write endpoints, and frontend work.
- Known issues: none in BE-012.
- Next logical task: BE-013 authorization foundation only.
