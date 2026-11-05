# Backend Handoff

- Task ID: BE-017
- Exact base SHA: `2a37ee7ac40ec818fa3329035278361d4ccbdcb2`
- Result: Complete and accepted for checkpoint. Added the saved Library surface plus public Creator discovery/reach/follow behavior.
- Library implementation: new `backend/library/` app provides API/read behavior only; it intentionally owns no duplicate Library model. `GET /api/v1/library/saved/` reads the authenticated user's existing `engagement.SavedIdea` rows.
- Saved Library contract: requires authentication; returns newest-save-first items shaped as `{saved_at, idea}`; underlying Idea uses the existing safe public Idea serializer. Only currently PUBLISHED Ideas are returned, so DRAFT/HIDDEN content cannot leak through a stale save.
- Library performance: SavedIdea + nested Idea/Creator/User/Source are select-related and active Idea Topics are prefetched. A query regression test isolates the data path with DRF force_authenticate and confirms two data queries. SessionAuthentication behavior remains covered separately by the auth suite.
- Stats boundary: the planned `GET /api/v1/library/stats/` remains deferred because the project open question explicitly requires defining what “read” means before reading/opening statistics exist. No ReadingEvent was added.
- CreatorFollow: new relational model in the existing creators domain with user FK, CreatorProfile FK, created_at, and unique `(user, creator)` database constraint.
- Public Creator API: `GET /api/v1/creators/`; `GET /api/v1/creators/<id>/`; and cursor-paginated `GET /api/v1/creators/<id>/ideas/`. Public profile fields are id/display_name/bio_fa/bio_en/avatar/is_verified plus follower_count/spark_count/idea_count. No email or account authority fields are exposed.
- Reach counts: implemented in `creators.selectors.public_creator_queryset()` using database annotations. follower_count counts follow relations; idea_count counts only PUBLISHED Ideas; spark_count counts Sparks attached to PUBLISHED Ideas. Draft/Hidden reach is excluded.
- Follow contract: authenticated + CSRF-protected `PUT/DELETE /api/v1/creators/<id>/follow/`. PUT/DELETE are idempotent; self-follow returns 400; missing Creator returns 404. No notification behavior is introduced yet.
- Creator Ideas: the separate subresource was selected because source requirements require published Ideas on the Creator experience while canonical docs do not define a specific nested route. Keeping Ideas separate avoids unbounded arrays in Creator detail and permits cursor pagination.
- Migration: `creators.0002_creatorfollow` was generated, inspected, and applied to PostgreSQL. It contains only CreatorFollow and its unique constraint. The library app has no model migration.
- Tests/checks: focused creators+library suite 29 tests passed; full backend suite 173 tests passed; Django check, migration drift check, creators showmigrations, pip check, and git diff check all pass.
- Files changed/new: `backend/config/settings.py`; `backend/api/urls.py`; `backend/creators/models.py`; `serializers.py`; `views.py`; `urls.py`; `tests.py`; new `selectors.py`; new `migrations/0002_creatorfollow.py`; new `backend/library/` app files including serializers/views/urls/tests; `docs/ai/backend/STATE.md`; `docs/ai/backend/HANDOFF.md`.
- Known issues: none identified.
- Next logical task: BE-018 Explore/Search.
- Delivery: ready for one bounded BE-017 checkpoint commit/push.
