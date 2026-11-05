# Backend State

- BE-014 status: Complete; awaiting Backend Lead review. No BE-014 commit or push was made.
- BE-014 base SHA: `0741c75433b7b1ca84ff028575c69c8064e29234` (accepted/pushed BE-013 authorization checkpoint).
- Creator self-service: authenticated Users may create their own optional `CreatorProfile` at `/api/v1/me/creator/`; GET returns 404 before creation, POST creates only for `request.user`, and PATCH updates only creator-editable profile data. `user_id`, `is_verified`, `id`, and `created_at` are read-only.
- Creator profile security: clients cannot select another User or self-verify. Unsafe authenticated profile writes remain protected by Django/DRF session CSRF enforcement.
- Private Idea workspace: `GET/POST /api/v1/me/ideas/` and `GET/PATCH/DELETE /api/v1/me/ideas/<pk>/` require Creator capability and are scoped to `Idea.creator.user == request.user`.
- Draft authoring: POST derives the CreatorProfile from the authenticated user and always creates `DRAFT` with `published_at=None`. Client-controlled creator/status/publication timestamps are not writable.
- Draft inputs: Source is an existing Source primary key; Topic input uses active Topic primary keys only; inactive Topic selection is rejected; `estimated_read_seconds` is API-validated as at least 1 in addition to the existing database constraint.
- Lifecycle restriction: only owned DRAFT Ideas can be PATCHed or DELETEd in this workspace. PUBLISHED and HIDDEN Ideas remain visible to their owner in the private workspace but cannot be edited/deleted by the draft workflow. Publication/unpublication remains deferred.
- Authorization: BE-014 reuses BE-013 `IsCreator` and `IsCreatorOwner`; private Idea querysets are additionally owner-scoped. No moderator bypass is introduced.
- Public API regression: public `/api/v1/ideas/` remains anonymous/read-only and PUBLISHED-only; Topic, Source, health, and BE-012 authentication contracts remain unchanged.
- Database/migrations: no model/schema changes and no BE-014 migration. `makemigrations --check --dry-run` reports no changes.
- Validation: creator/content focused suites pass (76 tests); the full backend suite passes (129 tests); `manage.py check`, `python -m pip check`, and `git diff --check` pass.
- Excluded: publication transitions, unpublishing, moderation actions, engagement, library, feed/recommendation/search, messaging, notifications, TTS, and frontend work.
- Known environment note: invoking the venv through `backend/../.venv` emits the pre-existing harmless Python 3.14 `sys.prefix` normalization warning. An unrelated untracked `.openidea/` directory was present before BE-014 and was left untouched.
- Next logical milestone: define a larger product slice after review, likely publication workflow plus creator-facing public profile/read APIs or engagement, without reopening the completed authentication/authorization foundations.
