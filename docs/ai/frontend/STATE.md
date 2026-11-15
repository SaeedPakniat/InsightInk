# Frontend State

- Task: FE-020 — Related Ideas on Idea Detail.
- Status: ACCEPTED by user; checkpointed in the FE-020 commit containing this state.
- Accepted frontend base: `8769ff07a5c8b646e0d0ce5a855ecd71042d7a50`.
- Branch: `master`.
- Scope: frontend and frontend AI documentation only; backend implementation files unchanged.

## FE-020 delivered

- Public related-Idea client for `GET /ideas/:idea_id/related/`.
- `RelatedIdeaItem` frontend type including backend `similarity`.
- Related-Idea query key/hook with finite non-paginated results.
- Related Ideas section integrated into public Idea Detail between source context and discussion.
- Existing `RecommendedIdea` + `IdeaCard` reused.
- Loading/error/retry/empty states.
- Anonymous viewers remain public and do not hydrate engagement.
- Authenticated viewers hydrate Spark/Save state for related cards.
- English/Persian reason direction follows reason language.
- Related Idea content direction follows each Idea language.
- Content-language saves invalidate related-Idea cache in addition to recommendations/latest feed.

FE-020 closes FE-019 High finding H-01.

## Verification

- TypeScript PASS.
- ESLint PASS.
- focused FE-020 tests: 4 files / 12 tests PASS.
- full Vitest: 51 files / 202 tests PASS.
- production build PASS — 193 modules.
- Prettier PASS.
- npm runtime audit PASS — 0 vulnerabilities.
- `git diff --check` PASS.
- backend RelatedIdeasAPITests: 8/8 PASS.
- no dependency/lockfile changes.
- no backend implementation changes.
- IdeaDetailPage: 19.95 KB / 4.58 KB gzip.
- no Vite chunk-size warning and no chunk over 500 KB.

## Browser review

Real Chromium review passed using safe intercepted API responses.

Desktop English:
- two related cards;
- mixed English/Persian reason direction;
- correct related Idea links;
- Related Ideas before Discussion;
- sticky shell;
- one language switch;
- no overflow.

390px Persian RTL:
- localized related section;
- mixed-language cards preserve content direction;
- directly visible header language switch;
- sticky shell;
- no horizontal overflow.

No visual correction was required.

## Remaining FE-019 priority

High:
- FE-021 — authenticated UI-language preference synchronization.

Then:
- FE-022 completeness polish:
  - Share;
  - Account links to Interests/Content Languages;
  - route/render error boundary;
  - preserve query/hash through auth redirect.
- hardening;
- motion;
- PWA.

## Next

1. FE-021 — authenticated UI-language preference synchronization.
2. FE-022 completeness polish.
3. hardening.
4. motion.
5. PWA.
