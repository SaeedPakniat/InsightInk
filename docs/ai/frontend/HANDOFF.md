# Frontend Handoff

- Task: FE-017 — Account Profile + Avatar Integration.
- Accepted frontend base: `48e7fbd52b14497bed3d6ca5e32a32b69b15519c` on `master`.
- Result: ACCEPTED by user; checkpointed in the FE-017 commit containing this handoff.
- Scope remained frontend-only; no backend implementation files changed.

## Backend contracts consumed

- `GET /api/v1/me/` returns complete `CurrentUser` including nullable `avatar_url`.
- `PATCH /api/v1/me/` updates partial account metadata; FE-017 edits only `display_name`.
- `PUT /api/v1/me/avatar/` accepts multipart field `avatar` and returns `{ avatar_url }`.
- `DELETE /api/v1/me/avatar/` returns 204 and clears the universal account avatar.
- Avatar backend: `c9ad9f6`.
- Hidden-Idea backend for next task: `e4ec791`.

## Delivered

- Lazy protected `/account` route and account-menu link.
- Account details surface with editable display name and read-only email.
- Universal avatar upload, replacement and deliberate removal confirmation.
- Exact UI constraints: JPEG/PNG/WebP, max 5 MiB.
- Localized validation, loading, success and failure states in English/Persian.
- Shared API client now preserves browser-generated multipart boundaries for FormData while retaining CSRF and cookies.
- `CurrentUser.avatar_url` is now the required nullable field defined by the backend.
- Session cache updates make header avatar/name changes immediate.
- Existing AccountAvatar reused; no second avatar identity system.
- CreatorProfile avatar remains separate.
- Persistent header language toggle remains header-only and unique.
- Under 30rem, the full InsightInk wordmark collapses to the existing accessible brand mark to prevent compact-header crowding while preserving the permanent language switch.

## Tests and quality gates

- `npm run typecheck`: PASS.
- `npm run lint`: PASS.
- Focused FE-017 suite: PASS — 5 files / 38 tests.
- `npm test`: PASS — 49 files / 187 tests.
- `npm run build`: PASS — 189 modules transformed.
- `npm run format:check`: PASS.
- `npm audit --omit=dev`: PASS — 0 vulnerabilities.
- `git diff --check`: PASS.

Production output observations:

- CSS: 107.14 KB / 14.19 KB gzip.
- AccountPage lazy chunk: 6.01 KB / 1.91 KB gzip.
- Client chunk: 28.72 KB / 9.49 KB gzip.
- Main entry: 392.49 KB / 120.66 KB gzip.
- No chunk exceeds 500 KB; no Vite chunk-size warning.
- No package manifest or lockfile changes.

## Browser/manual review

The running Vite frontend was rendered in headless Chromium. To avoid creating or modifying a real user, Chrome DevTools interception was limited to the session/account API endpoints while the actual React route, CSS and native file input were exercised.

Passed:
- desktop English account surface;
- sticky header;
- account-menu Account link;
- display-name save and immediate header identity update;
- avatar file selection/upload;
- removal confirmation and initials fallback;
- blank display-name email fallback;
- Persian RTL transition;
- compact 390px account surface;
- single visible language control in the header;
- one-column compact layout;
- no horizontal overflow.

Visual correction during review:
- the first 390px RTL screenshot showed the full wordmark crowding permanent controls;
- below 30rem the wordmark now hides while the existing accessible brand mark remains;
- re-review passed.

No API CONTRACT ISSUE was found.

## Next

- FE-018 — Moderator Hidden Ideas workspace.
- After FE-018: frontend completeness audit, bounded motion/interaction polish, then PWA.
