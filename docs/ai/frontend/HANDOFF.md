# Frontend Handoff

- Task ID: FE-001A (FE-001 follow-up)
- Base commit: `3c31895a62254008bab437be26e8c9d0e34920e8`
- Result: Accepted by user; ready for checkpoint commit/push.
- Files changed: new `frontend/` production frontend; root launchers `run backend.sh`, `run frontend.sh`, `run website.sh`; frontend motion/i18n test updates; `docs/ai/frontend/STATE.md` and `HANDOFF.md`. No backend implementation files modified.
- Architecture: React + TypeScript + Vite; React Router for routes; TanStack Query for server state; i18next/react-i18next for bilingual UI; plain CSS tokens/components; no Redux/Zustand/UI framework.
- API assumptions used: existing `GET /api/v1/auth/csrf/`, `POST /api/v1/auth/register/`, `POST /api/v1/auth/login/`, `POST /api/v1/auth/logout/`, `GET /api/v1/me/`. Current-user fields are exactly `id`, `email`, `display_name`, `preferred_ui_language`.
- Session/CSRF: `credentials: include`; unsafe requests fetch CSRF first and send `X-CSRFToken`; 401/403 from `/me/` means anonymous.
- Dev integration: Vite proxy maps `/api` to Django on `127.0.0.1:8000`. Frontend default API base is `/api/v1`.
- Routes/screens: bilingual landing, login, registration, protected authenticated shell/home, logout, 404.
- RTL/LTR: Persian default RTL and English LTR from the first render; CSS uses logical start/end properties where direction matters.
- Accessibility: semantic links/buttons/forms, associated labels, visible focus, error semantics, sufficient touch sizes, reduced-motion rule.
- Design decisions: retain prototype Ink/Parchment/Spark/Tide identity; remove investor-demo phone framing, fake status bars, presentation-only layout, clickable div patterns, and external font dependency from production foundation.
- Commands/tests run: `npm run typecheck`; `npm run lint`; `npm test`; `npm run build`; `npm run format:check`; `npm audit --omit=dev`; live curl smoke through Vite proxy.
- Results: all code gates pass; after the language-morph refinement there are 3 test files / 6 tests passing; production build succeeds (~136.01 KB JS gzip); runtime npm audit reports 0 vulnerabilities; auth smoke register→me→logout passes. Combined launcher was smoke-tested on ports 8011/5181: frontend 200, proxied CSRF 200, Ctrl+C cleanup closed both ports.
- Important decisions: keep the existing FE-001 visual direction; add restrained motion rather than redesign. The initial directional color sweep was replaced at user request by a custom alphabet/word-tile morph: target-language tiles flow from the target reading direction, assemble like temporary blocks, then reveal the translated UI. Timed `dir`/i18n switch remains hidden inside the effect; reduced-motion is immediate. No animation library added.
- Known issues: user should do a normal interactive pass of the new motion before checkpoint commit; UI-language choice is local until a backend profile update contract exists; dev-only lint dependency advisories remain; no E2E browser suite yet.
- API contract issues: none for FE-001.
- Next logical task: FE-002 — Reader interests onboarding using `GET /api/v1/topics/` and `GET/PUT /api/v1/me/interests/`. IdeaCard and feed integration follow as separate tasks.
