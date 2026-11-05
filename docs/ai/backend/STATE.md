# Backend State

- BE-015 status: Complete; accepted by Backend Lead pending checkpoint commit/push.
- BE-015 base SHA: `f68c5fa9241cbf5d2272e8179b2650594d101314` (clean repository after OpenIDEA ignore checkpoint).
- Core feed: public anonymous `GET /api/v1/feed/` is implemented as the baseline public feed.
- Visibility: feed candidates are strictly `Idea.status == PUBLISHED`; DRAFT and HIDDEN Ideas are excluded. Existing public Idea list/detail behavior remains unchanged.
- Pagination: feed uses DRF `CursorPagination` with fixed page size 10 and deterministic `-id` ordering. The response envelope is `next`, `previous`, and `results`. No client-controlled page-size parameter is added.
- Ranking boundary: BE-015 is intentionally not the recommendation system. The baseline ordering is stable newest-ID-first; interest/save/spark/follow/freshness/popularity scoring remains deferred to the later recommendation milestone.
- Query reuse: `content.selectors.public_idea_queryset()` centralizes the optimized public Idea queryset for both the existing public Idea API and the feed, using creator/user/source `select_related` plus active-Topic prefetch.
- Representation: feed reuses the existing safe public `IdeaSerializer`, including Creator summary, Source summary, reading estimate, publication timestamp, and active Topics only.
- Performance: a populated first feed page serializes nested public data in two database queries (Idea/select-related + Topic prefetch); CursorPagination performs no count query.
- Write safety: feed is read-only; POST/PUT/PATCH/DELETE return 405. Authentication is not required for public feed reads.
- Database/migrations: no model or schema change and no BE-015 migration. `makemigrations --check --dry-run` reports no changes.
- Validation: focused content suite passes 67 tests; full backend suite passes 135 tests; `manage.py check`, `python -m pip check`, and `git diff --check` pass.
- Excluded: personalization/recommendation ranking, UserInterest onboarding, engagement (Spark/Save/Comment), creator follow signals, search, moderation, realtime, messaging, notifications, TTS, and frontend work.
- Known issues: none identified in BE-015.
- Next logical backend milestone: BE-016 Engagement foundation/API (Spark + Save + Comments, with Report Comment only if its moderation contract can be implemented without inventing unresolved policy).
