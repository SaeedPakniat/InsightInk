# Backend Handoff

- Current checkpoint: NOTIF-RT — Realtime Delivery for Persisted In-App Notifications.
- Status: COMPLETE.
- Starting SHA: `42132216fe030735e66dd328edf932bc0f5c5b71`.
- Implementation SHA: `5454f656472a92f01894331729276927ac69eb95` (`feat(notifications): add realtime delivery`).
- PostgreSQL Notification rows + REST remain authoritative. Realtime delivery is best-effort only.

## Realtime architecture

NOTIF-RT reuses the existing BE-RT-001 account-level infrastructure.

WebSocket route:

`/ws/messaging/`

Session authentication/origin validation remain unchanged.

Each authenticated session joins only:

`messaging.user.<user_id>`

No notification-specific socket or user-selected subscription was added. The same account group now multiplexes messaging and notification event families.

The shared account publisher is `messaging.realtime.publish_user_event(...)`.

Notification persistence uses `notifications.realtime.schedule_notification_created(notification)`, which registers delivery through `transaction.on_commit`.

## Event contract

Exact notification event:

~~~json
{
  "type": "notification.created",
  "notification_id": 123,
  "notification_type": "message_received"
}
~~~

Only these three fields are emitted.

The socket does not transmit:

- comment body/preview;
- message body as notification data;
- Idea body;
- email;
- moderator identity;
- full Notification serialization;
- private conversation content;
- arbitrary notification payload blobs.

Clients must refetch authoritative notification REST state.

## Notification types

Realtime delivery applies to the existing persisted types:

- `message_received`
- `creator_followed`
- `comment_received`
- `idea_hidden`
- `idea_restored`

`creator_published` remains deferred.

## Commit boundary and failure isolation

Notification creation remains atomic with its domain mutation. After the PostgreSQL transaction successfully commits, the registered callback sends `notification.created`.

Rolled-back Notification rows emit no event.

If Redis/Channels is unavailable after commit:

- the domain mutation remains committed;
- the Notification row remains committed;
- REST list still returns the notification;
- unread count remains correct;
- the realtime frame may be missed;
- reconnect/refetch restores client state.

The shared publisher catches/logs delivery errors instead of propagating them back into committed domain state.

## Reconnect and multi-session behavior

Every successful connection/reconnection still receives:

~~~json
{
  "type": "sync.required",
  "reason": "connected"
}
~~~

There is no event replay log. FE-NOTIF must respond by invalidating/refetching notification list + unread-count REST queries.

Every active session for the recipient account receives the same `notification.created` event. Unrelated authenticated users and anonymous users do not receive it.

## Messaging coexistence

Existing messaging realtime remains on the same route/group:

- `conversation.created`
- `message.created`
- `messages.read`
- `sync.required`

A message send can legitimately produce both:

- `message.created` → messaging UI;
- `notification.created` → notification list/badge invalidation.

The messaging tests were updated to select the relevant event type from the multiplexed account stream rather than assume the next frame is always a messaging event.

## REST contract remains unchanged

~~~text
GET  /api/v1/notifications/
GET  /api/v1/notifications/unread-count/
POST /api/v1/notifications/{notification_id}/read/
POST /api/v1/notifications/read-all/
~~~

Session authentication and CSRF behavior are unchanged.

NOTIF-RT does not add realtime synchronization for mark-one-read or mark-all-read.

## Schema

No migration was required.

Existing migration remains:

`notifications.0001_initial`

`makemigrations --check --dry-run` reports no changes.

## Verification

- focused NOTIF-RT: 13/13 PASS;
- combined messaging + notification realtime: 23/23 PASS;
- affected domains (`notifications messaging creators engagement moderation`): 165/165 PASS;
- full backend: 430/430 PASS;
- `manage.py check`: PASS;
- `makemigrations --check --dry-run`: no changes detected;
- `pip check`: clean;
- `git diff --check`: PASS.

## Real Redis smoke

Result:

`NOTIF_RT_REAL_REDIS_SMOKE_PASS`

Using temporary Redis on `127.0.0.1:6380`:

- recipient session A received the exact `notification.created` event;
- recipient session B received the same event;
- unrelated authenticated socket received nothing;
- REST list contained the persisted notification;
- unread count was 1;
- reconnect emitted `sync.required`;
- REST refetch after reconnect recovered the notification/unread state.

Disposable smoke users, sessions, and notification rows were removed. The temporary Redis container was stopped.

## Deliberate exclusions

NOTIF-RT does not implement:

- frontend notification UI;
- Web Push / VAPID / Push API;
- service-worker push handlers;
- OS notification prompts;
- Background Sync;
- Firebase Cloud Messaging;
- `creator_published`;
- followed-creator fan-out/batching;
- notification preferences;
- realtime mark-read synchronization;
- Kafka/Celery/event sourcing;
- durable socket queues or replay logs.

Next separate task when explicitly requested: FE-NOTIF. Do not combine frontend notification UI work into this backend checkpoint.
