# Frontend Handoff

- Task ID: FE-006 — Public Idea Detail
- Base commit: `7feec5c5e0a8ef345ccf3eaadcba4ff0a8d62075`
- Result: accepted by user; ready for checkpoint commit/push on top of BE-LANG-001.
- Route: public `/ideas/:ideaId`; API: public published-only `GET /api/v1/ideas/{id}/`.
- Files changed: Idea detail API/query/page/tests, shared FormatBadge/presentation helpers, IdeaCard links/refactor/tests, router, bilingual strings, detail/card CSS, FE-006 task/state docs. No backend implementation files modified.
- IdeaCard navigation uses title link + explicit Read full idea link; Source external URL remains a separate link, avoiding nested anchors.
- Detail content: full body, format/read time/published date, topics, curator, source context, optional cover, external source link.
- Error behavior: malformed ID -> local not-found without fetch; backend 404 -> unavailable-Idea state; other fetch error -> retry.
- Accessibility: semantic article, independent content lang/dir, status-announced skeleton, keyboard-native links.
- Compatibility: removed CSS `:has()` in favor of explicit optional-cover class.
- Live smoke: `/api/v1/ideas/40/` HTTP 200; missing 999999 HTTP 404.
- Visual review: real Persian Idea 40 checked at desktop 1440×1100 and mobile 390×844. Creator attribution alignment was tightened after the first desktop pass.
- Final checks: typecheck PASS; lint PASS; 15 test files / 32 tests PASS; build PASS; formatting PASS; runtime npm audit 0 vulnerabilities. Bundle ~141.90 KB JS gzip / ~6.66 KB CSS gzip.
- Do not commit/push until user accepts the reading page.
- Next likely task: FE-007 Spark + Save integration with optimistic UI.
