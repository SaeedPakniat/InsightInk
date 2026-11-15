# Frontend State

- Task: FE-018 — Moderator Hidden Ideas Workspace.
- Status: ACCEPTED by user; checkpointed in the FE-018 commit containing this state.
- Accepted frontend base: `d6a734a47fd9cb6211f25552bc67184546d04483`.
- Branch: `master`.
- Scope: frontend and frontend AI documentation only; backend implementation files unchanged.

## Delivered

- New moderator-only `/moderation/ideas` route under the existing `RequireModerator` boundary.
- Shared Reports / Hidden Ideas moderation workspace navigation.
- Existing report queue now includes the workspace switcher.
- Hidden-Idea cursor list consumes only the landed backend safe shape:
  - id, title, body excerpt, language, hidden status;
  - creator id/display name;
  - source id/type/title;
  - published_at and updated_at.
- UI deliberately labels `updated_at` as “Last updated”; it does not invent a hidden-at timestamp or hidden-by metadata.
- Cursor pagination with duplicate-ID protection.
- Loading, retryable error, empty and end-of-list states.
- Restore flow:
  - explicit confirmation;
  - warning that restoration republishes the Idea;
  - optional audit note capped at 2000;
  - trimmed note payload;
  - pending disabled state;
  - localized error/success feedback;
  - restored Idea removed from hidden workspace after refetch.
- Restore invalidates Idea detail, feed, recommendations, search, creator and library surfaces.
- English/Persian UI and RTL/LTR-safe mixed-language content.
- No recoverable hard-delete/trash behavior was invented; moderator lifecycle remains hidden -> published.

## Verification

- TypeScript: PASS.
- ESLint: PASS.
- Focused FE-018 tests: 4 files / 19 tests PASS.
- Full Vitest: 50 files / 195 tests PASS.
- Production build: PASS — 191 modules.
- Prettier: PASS.
- `npm audit --omit=dev`: PASS on retry — 0 vulnerabilities.
- `git diff --check`: PASS.
- Backend `moderation.test_hidden_ideas`: 8/8 PASS using the normal project environment.
- No dependency or lockfile changes.
- HiddenIdeasPage lazy chunk: 5.93 KB / 1.67 KB gzip.
- No Vite chunk-size warning and no chunk over 500 KB.

## Browser review

Real Chromium rendering through the existing Vite server passed using interception only for session/moderation API responses, so no real moderator content was changed.

Verified:
- desktop English moderator workspace;
- persistent header moderation destination active;
- Hidden Ideas workspace tab active;
- hidden cards and safe metadata;
- restore confirmation;
- trimmed restore note payload;
- post-restore removal and success state;
- Persian RTL;
- 390px compact layout;
- full-width workspace tabs;
- one-column compact metadata;
- sticky header;
- single visible language toggle;
- no horizontal overflow.

## Product boundary

FE-018 covers moderator-hidden Ideas only.

- Moderator removal remains non-destructive `hidden`.
- Moderator restore is `hidden -> published`.
- Creator draft hard deletion remains permanent and is not represented in this workspace.
- A future trash/recoverable-delete requirement would require a new backend lifecycle/data-retention contract.

## Next

1. Frontend completeness audit.
2. Bounded motion/interaction polish.
3. PWA.
