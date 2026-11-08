# Backend State

- BE-MOD-HIDDEN-001 status: Complete; implementation committed and verified, backend checkpoint documentation ready to commit.
- Exact starting SHA: `9673026596432952b63e6f1438487bd9502271d0` on `master`, equal to pre-task `origin/master`.
- Exact implementation commit SHA: `e4ec7914ecae1caeb8affb7d10254e2ac15c8530` (`feat(moderation): add hidden idea workspace`).
- Endpoint: Moderator/Admin-only `GET /api/v1/moderation/ideas/?status=hidden`, enforced by the existing `IsModeratorOrAdmin`; ordinary Readers, non-moderator Creators, staff-only users, and anonymous users remain forbidden.
- Filter contract: `status` is required and `hidden` is the only accepted value; missing, `published`, `draft`, `withdrawn`, and arbitrary values return DRF HTTP 400. The queryset independently filters the constant `Idea.IdeaStatus.HIDDEN`.
- Visibility/current state: `Idea.status` is authoritative; only currently hidden Ideas are listed. Creator drafts, published Ideas, and creator-withdrawn Ideas remain excluded. `ModerationAction` remains audit history.
- Safe result contract: exactly `id`, `title`, `body_excerpt`, `language`, `status`, `creator{id,display_name}`, `source{id,type,title}`, `published_at`, and `updated_at`; no full body, account internals, broader Source data, reports, notes, moderator identity, or audit history.
- Excerpt: bodies at or below 240 Unicode characters are unchanged; longer bodies use `body[:239] + "…"`, yielding exactly 240 characters.
- Query/pagination: `select_related("creator", "creator__user", "source")` prevents N+1 relationship reads. Dedicated cursor pagination uses page size 25 and deterministic ordering `-updated_at,-id`.
- Restore/audit compatibility: existing CSRF-protected `POST /api/v1/moderation/ideas/{id}/restore/` remains authoritative for `hidden -> published`, still records `idea_restored`, and restored Ideas naturally disappear from the workspace.
- Schema: no model change or migration; `makemigrations --check --dry-run` returned `No changes detected`.
- Focused moderation suite: 43/43 passed.
- Full backend suite: 380/380 passed (previous baseline 372).
- Quality: `manage.py check` PASS; migration drift none; `.venv/bin/python -m pip check` clean; `git diff --check` PASS.
- Disposable live API smoke: published Idea hidden and listed with exact minimal shape; ordinary Reader forbidden; disposable draft/withdrawn Ideas excluded; restore returned published/`idea_restored`; restored Idea absent; hide/restore audit rows verified; all disposable data cleaned.
- Frontend preservation: FE-016 remained unstaged and task-untouched. Deterministic frontend tracked+untracked non-ignored filename/content hash before and after: `2531cfb06e78e154006d2d920ea38ff5fe96e1585fff45a1fa978f9b3aa6a05c`.
- Teaching notes: appended `BE-MOD-HIDDEN-001 — Safe Moderator Read Models and Cursor Pagination` outside the repository without staging it.
- Remaining blockers: none. No frontend implementation was performed.
