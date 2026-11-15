# Frontend Handoff

- Task: FE-021 — Authenticated UI-Language Preference Synchronization.
- Accepted frontend base: `0f8f4e8e64a7188627da688863e53e8f609c09ca` on `master`.
- Result: ACCEPTED by user; checkpointed in the FE-021 commit containing this handoff.
- Scope remained frontend-only; no backend implementation files changed.

## Contract consumed

Existing account metadata contract:

`PATCH /api/v1/me/`

FE-021 sends only:

`{ "preferred_ui_language": "fa" | "en" }`

The complete returned `CurrentUser` becomes the canonical session cache value.

No API CONTRACT ISSUE was found.

## Delivered

- Account-backed authenticated UI-language persistence.
- Anonymous local-only language behavior preserved.
- Account preference overrides conflicting localStorage after session resolution.
- Session cache replacement after successful PATCH.
- Recommendation invalidation after successful UI-language persistence.
- Optimistic local switch with rollback on account PATCH failure.
- Localized rollback alert.
- Morph and reduced-motion behavior preserved.
- Header language control location preserved.
- Compact error bubble corrected to remain within viewport.
- Registration copy updated to describe account-backed language preference.

## Tests and quality gates

- TypeScript PASS.
- ESLint PASS.
- focused FE-021: 3 files / 26 tests PASS.
- full Vitest: 51 files / 208 tests PASS.
- build PASS — 193 modules.
- Prettier PASS.
- npm audit runtime: 0 vulnerabilities.
- git diff check PASS.
- no package changes.

Production:

- CSS: 113.71 KB / 14.77 KB gzip.
- AccountPage: 5.80 KB / 1.82 KB gzip.
- main entry: 398.65 KB / 122.29 KB gzip.
- no chunk warning.

## Browser review

Safe request interception was used; no real account was modified.

Passed:

- local English vs account Persian reconciliation;
- exact successful English account PATCH;
- session/browser state remains English after success;
- exact attempted Persian PATCH on forced failure;
- server preference stays English;
- browser UI/localStorage/lang/dir roll back to English;
- error message shown in restored language;
- 390px compact error entirely within viewport;
- sticky shell and directly visible language control preserved;
- no horizontal overflow.

## Pending

- Next: FE-022 bounded completeness polish bundle, Medium effort.
