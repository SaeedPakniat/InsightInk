# Backend State

- BE-006 status: Complete.
- Base checkpoint: `698246b0cd6117c364cbff2fe77c0568814ab7bb` (`master`, accepted/pushed BE-005).
- Django project: `backend/` with configuration package `backend/config/`.
- REST API framework: Django REST framework `3.18.3`, registered as `rest_framework`.
- API namespace: `/api/v1/`, organized by the non-domain `backend/api/` routing package.
- Health endpoint: unauthenticated read-only `GET /api/v1/health/` returns HTTP 200 JSON `{"status": "ok"}`; mutation methods return HTTP 405.
- Custom User: `accounts.User`; CreatorProfile remains the creator-specific one-to-one capability model.
- Content domain: `backend/content/`, registered as one Django app containing `Topic`, `Source`, and `Idea`.
- Topic: unique 80-character slug, required Persian and English names, and active-by-default state.
- Source: bounded book/article/movie/podcast type, required title and free language tag, optional creator text and URL-based cover/external link, and limited JSON metadata.
- Idea: required protected relationships to `creators.CreatorProfile` and `content.Source`; required language, title, body, and positive estimated read time; draft/published/hidden status; nullable publication time; automatic timestamps; optional many-to-many Topics.
- Constraints and lifecycle: `content_idea_estimated_read_seconds_gt_0` enforces a strictly positive read time; CreatorProfile and Source deletion is protected while referenced by an Idea.
- Migration: `content.0001_initial` generated, inspected, and applied to local PostgreSQL.
- Validation: five focused API tests cover the exact route, status, JSON contract, content type, anonymous access, and rejected mutation methods; all 22 backend tests, Django checks, migration drift, dependency health, and Git whitespace validation pass.
- Deferred: all User, CreatorProfile, Topic, Source, and Idea serializers/endpoints; authentication, permissions/RBAC, pagination, publishing lifecycle, feeds, engagement, library, search, recommendations, moderation workflows, messaging, notifications, TTS, membership/eBooks, and frontend work.
- Known environment note: PostgreSQL connectivity has previously been intermittent; no BE-006 model or schema change exists.
- Next logical task: define and review a narrowly scoped read-only business API milestone, starting with the documented Topic API, without adding authentication or adjacent APIs unless explicitly requested.
