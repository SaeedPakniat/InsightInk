# Frontend Handoff

- Current task: FE-019 — Frontend Completeness Audit.
- Base audited: `1c970bcfedd706dd165c519e9b4343d1a6821855` on `master`.
- Result: audit complete; no production frontend/backend implementation changed.
- Detailed audit: `docs/ai/frontend/tasks/FE-019.md`.

## Audit result

No Blockers.

High priority:

1. **Related Ideas missing from Idea Detail**
   - backend `GET /api/v1/ideas/:idea_id/related/` already exists and is public;
   - repository product scope/frontend mapping explicitly requires related Ideas;
   - frontend has no related API/query/UI.

2. **Authenticated UI language is not persisted back to the account**
   - `preferred_ui_language` exists and PATCH `/api/v1/me/` supports it;
   - current LanguageToggle changes only localStorage/i18next/document direction;
   - backend recommendation explanation language uses the stale account preference;
   - cross-device UI preference therefore diverges.

Medium priority:

- Idea Share action absent.
- Account/Profile does not link the existing Interests and Content Languages settings.
- No localized route/render error boundary for lazy/import/render failures.
- No repeatable Playwright E2E, axe-style accessibility automation, or completed compatibility matrix.

Low priority:

- auth redirect loses query/hash;
- optional direct Creator directory is absent despite backend creator-list support.

## Important confirmations

- Topic browsing is already implemented through Search topic filters.
- Admin work remains correctly delegated to Django Admin.
- Source traceability is complete.
- Onboarding continuity is complete.
- Moderation frontend is complete for the current backend lifecycle.

## Quality baseline audited

- TypeScript PASS.
- ESLint PASS.
- Vitest PASS — 50 files / 195 tests.
- production build PASS — 191 modules.
- Prettier PASS.
- npm runtime audit PASS — 0 vulnerabilities.
- no dependency concern identified by FE-019.

## Next recommended implementation

### FE-020 — Related Ideas on Idea Detail

Recommended effort: MEDIUM.

Use the landed public related-Idea backend contract; reuse IdeaCard and existing engagement hydration rules. No architecture escalation expected.

Then:

### FE-021 — Authenticated UI-language preference synchronization

Recommended effort: MEDIUM.

Use the existing account PATCH contract; keep the language switch exactly where it is in the persistent header.

After FE-020/021:
- bounded completeness polish;
- hardening;
- motion;
- PWA.

Second-wave messaging/notifications/TTS/membership remain deliberately deferred.
