# Backend State

- BE-005 status: Complete.
- Base checkpoint: `46a000ed2de65dacd7fcfc7f5fca399b61ce3077` (`master`, accepted/pushed BE-004).
- Django project: `backend/` with configuration package `backend/config/`.
- Custom User: `accounts.User`; CreatorProfile remains the creator-specific one-to-one capability model.
- Content domain: `backend/content/`, registered as one Django app containing `Topic`, `Source`, and `Idea`.
- Topic: unique 80-character slug, required Persian and English names, and active-by-default state.
- Source: bounded book/article/movie/podcast type, required title and free language tag, optional creator text and URL-based cover/external link, and limited JSON metadata.
- Idea: required protected relationships to `creators.CreatorProfile` and `content.Source`; required language, title, body, and positive estimated read time; draft/published/hidden status; nullable publication time; automatic timestamps; optional many-to-many Topics.
- Constraints and lifecycle: `content_idea_estimated_read_seconds_gt_0` enforces a strictly positive read time; CreatorProfile and Source deletion is protected while referenced by an Idea.
- Migration: `content.0001_initial` generated, inspected, and applied to local PostgreSQL.
- Validation: Django checks pass; migration drift reports no changes; all 11 focused content tests and all 17 backend tests pass; PostgreSQL introspection confirms the ownership relation and check constraint; Git whitespace validation passes.
- Deferred: publishing lifecycle, APIs, feeds, engagement, library, search, recommendations, moderation workflows, messaging, notifications, TTS, membership/eBooks, and frontend work.
- Known environment note: the first sandboxed database connection returned the known intermittent Psycopg `connection is bad` error; migration and every database-backed verification passed through the established normal PostgreSQL execution path.
- Next logical task: define and review the next backend milestone for the REST API foundation without expanding BE-005.
