# Backend Handoff

- Task ID: BE-016
- Exact base SHA: `7a0676be8fcdb1ffa7906da85dd0d888bf373e35`
- Result: Complete and accepted for checkpoint. Added the first Reader engagement vertical slice: Spark, Save, and Comments.
- Domain structure: new `backend/engagement/` app contains engagement models, serializers, views, URLs, migration, and focused tests. This preserves the locked modular-monolith domain boundary.
- Models: `Spark(user, idea, created_at)`; `SavedIdea(user, idea, saved_at, last_opened_at?)`; `Comment(author, idea, body, status, created_at, updated_at)`. Spark and SavedIdea enforce unique `(user, idea)` constraints. Comment statuses are exactly visible/hidden/deleted.
- Spark contract: `PUT /api/v1/ideas/<id>/spark/` ensures one Spark exists; repeated PUT remains 204 with one row. DELETE ensures the current user's Spark is absent; repeated DELETE remains 204. Auth + session CSRF required.
- Save contract: `PUT /api/v1/ideas/<id>/save/` and DELETE mirror Spark idempotency and security. SavedIdea is intentionally the future basic library entry; no duplicate LibraryEntry model was added.
- Comment read/create: `GET /api/v1/ideas/<id>/comments/` is anonymous and returns only visible comments with safe author summary `id/display_name`; POST requires auth + CSRF, derives author/Idea server-side, forces visible status, trims body, rejects blank body, and caps API input at 4,000 characters.
- Comment delete: `DELETE /api/v1/comments/<id>/` requires authenticated ownership + CSRF and soft-deletes to status `deleted`. Repeated owner delete is idempotent. Other ordinary users receive 403. Hidden/deleted comments never appear in public comment lists.
- Content visibility: all engagement endpoints target PUBLISHED Ideas only. DRAFT/HIDDEN Ideas are treated as unavailable on public engagement routes.
- Moderation boundary: moderator/admin comment-removal behavior and `POST /comments/<id>/report/` are deferred to the moderation milestone because the project requires audited moderation actions while Report target/reason design remains intentionally unresolved.
- Migration: `engagement.0001_initial` was generated, inspected, and applied to PostgreSQL. It contains only the three engagement models and their documented constraints.
- Tests/checks: focused engagement suite 24 tests passed; full backend suite 159 tests passed; Django check, migration drift check, pip check, and git diff check pass.
- Files changed/new: `backend/config/settings.py`; `backend/api/urls.py`; new `backend/engagement/__init__.py`; `apps.py`; `admin.py`; `models.py`; `serializers.py`; `views.py`; `urls.py`; `tests.py`; `migrations/__init__.py`; `migrations/0001_initial.py`; `docs/ai/backend/STATE.md`; `docs/ai/backend/HANDOFF.md`.
- Known issues: none identified.
- Next logical task: BE-017 Library + public Creator experience.
- Delivery: ready for one bounded BE-016 checkpoint commit/push.
