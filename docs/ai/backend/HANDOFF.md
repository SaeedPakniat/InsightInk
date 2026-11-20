# Backend Handoff

- Current checkpoint: NOTIF-001 — Persistent Per-User In-App Notifications.
- Status: COMPLETE.
- Starting SHA: `568f7998eff2c71c341c195a5b352a87336b0cd8`.
- Implementation SHA: `7b2be752dd2145a1e793cb7f92e0696a2f512e5e` (`feat(notifications): add persistent in-app notifications`).
- PostgreSQL is authoritative notification state. No notification realtime delivery exists in this checkpoint.

## Notification types

Implemented:

- `message_received`
- `creator_followed`
- `comment_received`
- `idea_hidden`
- `idea_restored`

Deferred:

- `creator_published` — follower fan-out/batching/preferences need a later explicit design.

## REST API contract

All endpoints use existing Django session authentication.

### List

`GET /api/v1/notifications/`

- authenticated recipient only;
- cursor pagination, page size 30;
- newest first;
- fields: `id`, `type`, `actor`, `target`, `created_at`, `read_at`, `is_read`.

Safe target shapes:

- `message_received`: `{"message_id": ..., "conversation_id": ...}`
- `creator_followed`: `{"creator_id": ...}`
- `comment_received`: `{"comment_id": ..., "idea_id": ...}`
- `idea_hidden` / `idea_restored`: `{"idea_id": ..., "title": ...}`

`comment_received` deliberately contains no comment body or preview. Clients must refetch authoritative comment/idea data when navigating.

Actor summaries contain only `id` and `display_name`. Moderation hide/restore notifications use `actor = null` so moderator identity is not exposed to the creator.

### Unread count

`GET /api/v1/notifications/unread-count/`

Response:

~~~json
{"unread_count": 3}
~~~

### Mark one read

`POST /api/v1/notifications/{notification_id}/read/`

- CSRF required;
- idempotent;
- returns the updated notification representation;
- query is constrained by authenticated recipient;
- a different authenticated account receives HTTP 404.

### Mark all read

`POST /api/v1/notifications/read-all/`

- CSRF required;
- updates only the authenticated recipient's unread rows.

Response shape:

~~~json
{
  "marked_read": 3,
  "read_at": "..."
}
~~~

## Persistence and domain integration

Notification persistence is atomic with the domain mutation:

- Message send -> notify the other conversation participant.
- New creator follow -> notify the creator account only on first follow creation.
- New comment -> notify the idea creator unless the creator authored the comment.
- Direct idea hide -> notify the idea creator, without exposing moderator identity.
- Direct idea restore -> notify the idea creator, without exposing moderator identity.

If notification creation fails inside one of these services, the paired mutation rolls back. Messaging's existing Channels/Redis delivery remains post-commit and is unchanged.

## Schema

Migration:

`notifications.0001_initial`

Local development database migration applied successfully.

## Verification

After the final comment-payload privacy hardening:

- notification focused tests: 12/12 PASS;
- affected domains (`notifications messaging creators engagement moderation`): 152/152 PASS;
- full backend: 417/417 PASS;
- `manage.py check`: PASS;
- `makemigrations --check --dry-run`: no changes detected;
- `pip check`: clean;
- `git diff --check`: PASS.

Real development-DB smoke:

`NOTIF_SMOKE_PASS`

Smoke verified all five types through real domain/API paths, unread 5 -> 4 -> 0, outsider mark-read -> 404, then rolled the disposable records back.

## Deliberate limitations / next boundary

NOTIF-001 does not implement:

- notification WebSocket events or groups;
- Redis delivery for notifications;
- `creator_published`;
- followed-creator batching/fan-out;
- notification preferences;
- Web Push;
- background workers/Celery;
- frontend notification UI.

When explicitly requested, NOTIF-RT may reuse the existing Django Channels + Redis infrastructure. It must treat persisted Notification rows/REST as source of truth and use realtime only as delivery/invalidation, not as authoritative state.

Stop at this checkpoint; do not combine NOTIF-RT into NOTIF-001.
