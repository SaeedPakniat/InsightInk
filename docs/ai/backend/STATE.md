# Backend State

- BE-017 status: Complete; accepted by Backend Lead pending checkpoint commit/push.
- BE-017 base SHA: `2a37ee7ac40ec818fa3329035278361d4ccbdcb2` (accepted/pushed BE-016 engagement checkpoint; clean starting worktree).
- Library domain: new `library` Django app owns Library API behavior without duplicating Save data. It queries the existing `engagement.SavedIdea`, matching the locked decision that Save is the basic Library entry.
- Saved Library API: authenticated `GET /api/v1/library/saved/` returns only the current user's SavedIdea rows whose Ideas are still PUBLISHED, ordered newest-save first. Each item exposes `saved_at` plus the existing safe public Idea representation.
- Library privacy/visibility: another user's saves are never returned; DRAFT/HIDDEN Ideas are excluded even if a SavedIdea row exists from earlier state. Nested Creator/Source data uses select_related and active Topics use prefetch; the Library data path is covered by a two-query regression test independent of session-auth queries.
- Library stats: `/api/v1/library/stats/` remains intentionally deferred. The project explicitly requires a measurable definition of “read” before reading/opening statistics are implemented; BE-017 does not invent one.
- CreatorFollow model: new `creators.CreatorFollow(user, creator, created_at)` with PostgreSQL-backed unique constraint on `(user, creator)`.
- Public Creator list/detail: anonymous `GET /api/v1/creators/` and `GET /api/v1/creators/<id>/` expose only public CreatorProfile information: id, display name, bilingual bios, avatar, verification state, and derived public reach counts. Email, user_id, staff/admin state, and other account internals are not exposed.
- Public Creator counts: `follower_count` derives from CreatorFollow rows; `idea_count` counts PUBLISHED Ideas only; `spark_count` counts Sparks across PUBLISHED Ideas only. Counts are query annotations rather than duplicated/stored counter fields.
- Creator published Ideas: anonymous cursor-paginated `GET /api/v1/creators/<id>/ideas/` returns only that Creator's PUBLISHED Ideas using the existing safe public Idea serializer and public Idea selector. Missing Creator IDs return 404.
- Follow API: authenticated/CSRF-protected `PUT/DELETE /api/v1/creators/<id>/follow/` is idempotent. Repeated PUT creates at most one relation; repeated DELETE leaves none. Self-follow is rejected as a routine domain validation rule.
- Migration: `creators.0002_creatorfollow` creates only CreatorFollow and its documented unique constraint. Applied successfully to PostgreSQL; migration drift is clean. The Library app adds no table/migration.
- Validation: focused creators+library suite passes 29 tests; full backend suite passes 173 tests; `manage.py check`, migration drift, `showmigrations creators`, `python -m pip check`, and `git diff --check` pass.
- Existing regression boundary: auth/session/CSRF, role authorization, creator self-workspace, draft authoring, public Idea API, cursor feed, Spark/Save/Comment behavior remain unchanged.
- Excluded: reading/statistics definition, Library filters, report/moderation workflow, search/explore, recommendation scoring, realtime, messaging, notifications, TTS, and frontend work.
- Known issues: none identified in BE-017.
- Next logical backend milestone: BE-018 Explore/Search, adding query search, topic browsing, source/type filters, and a deliberate Persian text-normalization baseline without introducing Elasticsearch or external search infrastructure.
