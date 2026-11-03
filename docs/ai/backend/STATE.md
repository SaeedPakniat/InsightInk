# Backend State

- BE-008 status: Complete.
- BE-008 starting SHA: `b783f7d7b0bbc9ebfe67721ebb3006fc94ed4339` (`master`).
- Django project: `backend/` with configuration package `backend/config/`.
- REST API framework: Django REST framework `3.18.3`, registered as `rest_framework`.
- API namespace: `/api/v1/`, organized by the non-domain `backend/api/` routing package.
- Health endpoint: unauthenticated read-only `GET /api/v1/health/` returns HTTP 200 JSON `{"status": "ok"}`; mutation methods return HTTP 405.
- Topic API: anonymous read-only `GET /api/v1/topics/` and `GET /api/v1/topics/<pk>/`; responses expose only `id`, `slug`, `name_fa`, and `name_en`, use numeric primary-key lookup, return active Topics only, and order lists by `id`. POST, PUT, PATCH, and DELETE are unavailable.
- Custom User: `accounts.User`; CreatorProfile remains the creator-specific one-to-one capability model.
- Content domain: `backend/content/`, registered as one Django app containing `Topic`, `Source`, and `Idea`.
- Topic: unique 80-character slug, required Persian and English names, and active-by-default state.
- Source: bounded book/article/movie/podcast type, required title and free language tag, optional creator text and URL-based cover/external link, and limited JSON metadata.
- Idea: required protected relationships to `creators.CreatorProfile` and `content.Source`; required language, title, body, and positive estimated read time; draft/published/hidden status; nullable publication time; automatic timestamps; optional many-to-many Topics.
- Constraints and lifecycle: `content_idea_estimated_read_seconds_gt_0` enforces a strictly positive read time; CreatorProfile and Source deletion is protected while referenced by an Idea.
- Migration: `content.0001_initial` generated, inspected, and applied to local PostgreSQL.
- Validation: seven focused Topic API tests cover anonymous list/detail access, the exact public field contract, deterministic ordering, active-only visibility, missing/inactive 404 responses, and rejected mutation methods; the existing five health endpoint tests remain covered. The synchronized project `.venv` passes all 29 backend tests, Django checks, migration drift, dependency health, and Git whitespace validation.
- Deferred: all User, CreatorProfile, Source, and Idea serializers/endpoints; Topic mutation and slug-based nested Idea routes; authentication, permissions/RBAC, pagination, publishing lifecycle, feeds, engagement, library, search, recommendations, moderation workflows, messaging, notifications, TTS, membership/eBooks, and frontend work.
- Known environment note: PostgreSQL connectivity has previously been intermittent, but final BE-008 verification passed against the configured local PostgreSQL service. The project `.venv` is synchronized with `requirements.txt`. No BE-008 model or schema change exists.
- Next logical task: define and review a narrowly scoped read-only Idea API milestone without implementing authentication, mutations, or adjacent domain APIs unless explicitly requested.
