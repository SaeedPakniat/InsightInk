# Frontend State

- Task: FE-017 — Account Profile + Avatar Integration.
- Status: ACCEPTED by user; checkpointed in the FE-017 commit containing this state.
- Accepted frontend base: `48e7fbd52b14497bed3d6ca5e32a32b69b15519c`.
- Branch: `master`.
- Scope: frontend and frontend AI documentation only; backend implementation files unchanged.

## Delivered

- Protected `/account` route under `RequireAuth`.
- Header account menu now links to `/account`.
- Display-name editing through `PATCH /api/v1/me/`; email is read-only.
- Universal account avatar upload/replacement through multipart `PUT /api/v1/me/avatar/`.
- Universal account avatar removal through `DELETE /api/v1/me/avatar/`.
- Shared `apiRequest` is FormData-aware: multipart bodies keep CSRF/cookies but do not receive a manual JSON Content-Type.
- Backend avatar constraints surfaced in UI: JPEG/PNG/WebP, maximum 5 MiB.
- Client-side early validation for oversize and clearly unsupported MIME; backend validation remains authoritative.
- Two-step avatar removal confirmation.
- `SESSION_QUERY_KEY` is updated immediately after profile/avatar mutations, so the persistent header updates without reload.
- `CurrentUser.avatar_url` now matches the landed backend contract as required `string | null`; legacy fixtures/fallbacks were updated with `null`.
- FE-016 `AccountAvatar` is reused and extended with a large presentation size.
- CreatorProfile avatar remains separate and untouched.
- Language toggle remains directly visible in the persistent header and exists once; it is not duplicated in account/mobile menus or the account page.
- Narrow-header visual correction: below 30rem the accessible InsightInk brand mark remains while the wordmark hides to prevent crowding with the always-visible language/account/menu controls.

## Verification

- TypeScript: PASS.
- ESLint: PASS.
- Focused FE-017 tests: 5 files / 38 tests PASS.
- Full Vitest: 49 files / 187 tests PASS.
- Production build: PASS — 189 modules.
- Prettier: PASS.
- `npm audit --omit=dev`: PASS — 0 vulnerabilities.
- `git diff --check`: PASS.
- No dependency or lockfile changes.
- AccountPage lazy chunk: 6.01 KB / 1.91 KB gzip.
- No Vite chunk-size warning and no chunk over 500 KB.

## Browser review

Real Chromium rendering through the existing Vite dev server passed using DevTools interception only for session/account API responses, avoiding changes to real database users.

Verified:
- English desktop account view;
- sticky header and account-menu route;
- display-name save reflected in header;
- avatar file upload/replacement surface;
- removal confirmation and initials fallback;
- blank display-name email fallback;
- Persian RTL;
- 390px compact layout;
- single visible header language control;
- no horizontal overflow.

An initial 390px RTL review exposed brand-wordmark crowding; the narrow brand treatment was fixed and reverified.

## Next

1. FE-018 — Moderator Hidden Ideas workspace.
2. Frontend completeness audit.
3. Motion/interaction polish.
4. PWA.
