# Frontend Handoff

- Task: FE-020 — Related Ideas on Idea Detail.
- Accepted frontend base: `8769ff07a5c8b646e0d0ce5a855ecd71042d7a50` on `master`.
- Result: ACCEPTED by user; checkpointed in the FE-020 commit containing this handoff.
- Scope remained frontend-only; no backend implementation files changed.

## Backend contract consumed

`GET /api/v1/ideas/:idea_id/related/`

- public/AllowAny;
- safe published Idea payload;
- finite list;
- score + similarity + deterministic reason;
- server-side content-language discovery filtering;
- candidate reason generated in candidate Idea language.

Backend RelatedIdeasAPITests: 8/8 PASS.

## Delivered

- Related API type/client.
- Related query key/hook.
- Idea Detail Related Ideas section.
- Existing RecommendedIdea/IdeaCard reused.
- anonymous public rendering preserved.
- authenticated engagement hydration for related cards.
- loading, retryable error and empty states.
- mixed-language reason/content direction.
- content-language saves invalidate related caches.
- EN/FA copy and RTL/LTR support.

## Quality gates

- TypeScript PASS.
- ESLint PASS.
- focused FE-020: 4 files / 12 tests PASS.
- full Vitest: 51 files / 202 tests PASS.
- build PASS — 193 modules.
- Prettier PASS.
- npm audit runtime: 0 vulnerabilities.
- git diff check PASS.
- no package changes.

Production:
- CSS 111.64 KB / 14.60 KB gzip.
- relatedIdeas query chunk 0.26 KB / 0.22 KB gzip.
- RecommendedIdea shared chunk 0.53 KB / 0.32 KB gzip.
- IdeaDetailPage 19.95 KB / 4.58 KB gzip.
- main entry 397.19 KB / 121.83 KB gzip.
- no chunk warning.

## Browser review

Desktop English and 390px Persian RTL passed.

Verified:
- correct section location in reading flow;
- correct related links;
- two-card related rendering;
- English/Persian reason direction;
- mixed content direction;
- sticky header;
- unique visible language switch;
- no horizontal overflow.

## Pending

- Next task: FE-021 — authenticated UI-language preference synchronization, Medium effort.
