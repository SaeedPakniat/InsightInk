# Frontend State

- Task: FE-021 — Authenticated UI-Language Preference Synchronization.
- Status: ACCEPTED by user; checkpointed in the FE-021 commit containing this state.
- Accepted frontend base: `0f8f4e8e64a7188627da688863e53e8f609c09ca`.
- Branch: `master`.
- Scope: frontend and frontend AI documentation only; backend implementation files unchanged.

## FE-021 delivered

- Authenticated header language changes now persist through existing `PATCH /api/v1/me/`.
- Exact persisted field: `preferred_ui_language`.
- Anonymous language switching remains local-only.
- Account preference wins over conflicting localStorage after authenticated session resolution/login.
- Successful persistence:
  - updates local UI/localStorage/document direction;
  - replaces `SESSION_QUERY_KEY` with backend response;
  - invalidates recommendations so backend-generated explanation language refreshes.
- Failed persistence:
  - restores previous language;
  - restores localStorage/lang/dir;
  - exposes localized alert feedback.
- Existing language morph/reduced-motion behavior preserved.
- Language control stays directly visible in the persistent header.
- Compact failure alert is viewport-safe below the sticky header.
- Registration language-storage copy updated to match account-backed behavior.

FE-021 closes FE-019 High finding H-02.

## Verification

- TypeScript PASS.
- ESLint PASS.
- focused FE-021: 3 files / 26 tests PASS.
- full Vitest: 51 files / 208 tests PASS.
- production build PASS — 193 modules.
- Prettier PASS.
- npm runtime audit PASS — 0 vulnerabilities.
- `git diff --check` PASS.
- no dependency/lockfile changes.
- no backend implementation changes.
- no Vite chunk-size warning and no chunk over 500 KB.

## Browser review

Real Chromium review passed using safe intercepted current-user/CSRF requests.

Verified:

- conflicting local English + account Persian -> account Persian wins;
- localStorage and document direction reconcile to account preference;
- Persian -> English sends exact account PATCH and remains English;
- failed English -> Persian PATCH rolls UI/localStorage/direction back to English;
- localized rollback alert shown;
- compact 390px alert fully fits viewport after one CSS correction;
- sticky header preserved;
- language switch remains directly visible exactly once;
- no horizontal overflow.

## Remaining FE-019 findings

Medium:
- Idea Share action.
- Account/Profile does not link existing Interests and Content Languages settings.
- No localized route/render error boundary.
- Repeatable E2E/accessibility/compatibility evidence is missing.

Low:
- auth redirect loses query/hash.
- optional direct Creator directory is absent.

High findings are now closed by FE-020 and FE-021.

## Next

1. FE-022 — bounded completeness polish bundle.
2. hardening.
3. motion.
4. PWA.
