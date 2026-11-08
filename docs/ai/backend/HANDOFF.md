# Backend Handoff

- Task ID: BE-MOD-HIDDEN-001 — Moderator Hidden-Idea Workspace API.
- Starting SHA: `9673026596432952b63e6f1438487bd9502271d0`; implementation SHA: `e4ec7914ecae1caeb8affb7d10254e2ac15c8530` (`feat(moderation): add hidden idea workspace`).
- Route/authority: `GET /api/v1/moderation/ideas/?status=hidden`; the existing `IsModeratorOrAdmin` is unchanged. Moderator and Admin are allowed; ordinary Reader, Creator without moderation authority, staff-only non-Moderator, and anonymous are forbidden.
- Required filter: `status=hidden` is mandatory and is the sole supported value. Missing and every unsupported status return HTTP 400. The ORM query explicitly uses `status=Idea.IdeaStatus.HIDDEN` rather than reflecting arbitrary query input.
- Scope: this is a hidden-moderation workspace, not a general private-Idea browser. Published, draft, and withdrawn Ideas are excluded; no role, lifecycle, audit-model, or content-model changes were introduced.
- Representation: exactly `id`, `title`, `body_excerpt`, `language`, `status`, `creator{id,display_name}`, `source{id,type,title}`, `published_at`, and `updated_at`. Full body and sensitive/broader Creator, Source, report, note, actor, and audit fields are absent.
- Excerpt rule: body unchanged when `len(body) <= 240`; otherwise `body[:239] + "…"`. Python Unicode character slicing is covered with Persian test content.
- Data access: current truth comes from `Idea.status`; `ModerationAction` remains historical audit. `select_related("creator", "creator__user", "source")` gives bounded relationship loading without N+1 queries.
- Pagination: dedicated `HiddenIdeaCursorPagination`, page size 25, ordering `("-updated_at", "-id")`; multi-page tests cover complete, duplicate-free, ordered hidden results while retaining `status=hidden` navigation.
- Restore: existing CSRF-protected restore endpoint and `idea_restored` audit action remain unchanged. Restore moves `hidden -> published`, after which the Idea is absent from the workspace.
- Migration: none; dry-run migration check reported no changes.
- Verification: focused moderation 43/43; full backend 380/380; Django check passed; pip check clean; diff check clean.
- Live smoke: disposable hide/list/authorization/exclusion/restore/audit lifecycle passed, and created records were removed without resetting the development database.
- FE-016 preservation: pre/post deterministic frontend hash matched exactly: `2531cfb06e78e154006d2d920ea38ff5fe96e1585fff45a1fa978f9b3aa6a05c`. No frontend or frontend-state file was staged by this task.
- External teaching notes appended; no remaining blockers; no frontend implementation delivered.
