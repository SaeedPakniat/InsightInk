# 07 — Realtime, Notifications and Text-to-Speech

Messaging realtime, persistent PostgreSQL notifications, and in-app realtime notification delivery are now implemented. Broader Save/Library live sync, notification preferences/push, and TTS remain separate later phases; this document keeps their shared architecture explicit.

# Part A — Realtime sync

## 1. Requirement

NFR-05 requires saved ideas and library changes to propagate across a user's devices within 2 seconds.

Related stories ask for:

- a save on a phone to appear on a laptop quickly;
- a synced/pending indicator;
- trust that a save actually completed.

## 2. Correct state model

PostgreSQL is the source of truth.

~~~text
Device A
  │
  │ save request
  ▼
Django REST API
  │
  ▼
PostgreSQL commit
  │
  └── realtime event
        ▼
     Channels
        │
      Redis
        │
        ▼
     Device B
~~~

Do not make WebSocket delivery the authoritative write.

## 3. Frontend sync states

A save control may expose:

~~~text
unsaved
saving/pending
saved/synced
error/retry
~~~

Optimistic UI may react immediately, but failures must be reconciled.

## 4. Reconnect behavior

If WebSocket disconnects:

- normal REST functionality continues;
- reconnect is attempted;
- server state is refetched;
- missed realtime events are not assumed to be permanent truth.

# Part B — Messaging

## 5. Messaging scope

BE-DM-001 now implements the persistent messaging core.

Direct messaging is between Reader/User and CreatorProfile only. It is not a general reader-to-reader messenger.

Each Conversation stores the Reader and Creator directly, with one unique conversation per pair. The Creator participant is the User behind that CreatorProfile.

## 6. Message persistence, read state and live delivery

~~~text
Client
  │
  │ authenticated REST write
  ▼
Django service
  │
  ▼
PostgreSQL commit  ← authoritative state
  │
  └── transaction.on_commit(...)
        │
        ▼
     Channels
        │
        ▼
 RedisChannelLayer
        │
        ▼
 messaging.user.<user_id>
        │
        ▼
 active authenticated WebSocket sessions
~~~

Current behavior:

- message history always comes from PostgreSQL;
- message bodies are immutable in the current core;
- `read_at` is set when the receiver explicitly marks incoming unread messages as read;
- conversation lists expose unread counts and a bounded latest-message preview;
- history is cursor-paginated;
- realtime events are scheduled only after the database transaction commits;
- Redis/channel-layer failure does not roll back or invalidate committed REST/database state;
- WebSocket is never used to create a Conversation, persist a Message, or change read state.

## 7. Authorization and reporting

Only the Reader and the Creator's User account may access a conversation. Non-participants receive HTTP 404.

A participant may report a Message received from the other participant. The existing moderation queue stores a `message` report target. Moderator report detail exposes only the reported Message and minimal sender identity; it does not provide casual browsing of the rest of the private conversation.

NFR-13 requires encrypted transport; a future deployed environment uses HTTPS/WSS.

## 8. Realtime messaging — implemented

BE-RT-001 adds authenticated Django Channels + Redis delivery on top of the persisted REST behavior.

WebSocket endpoint:

~~~text
/ws/messaging/
~~~

Authentication uses the existing Django session cookie through `AuthMiddlewareStack`, with WebSocket origin validation. Anonymous sockets are rejected.

Each authenticated session joins only its account group:

~~~text
messaging.user.<user_id>
~~~

A user may have multiple active browser/PWA sessions in the same group, so the same committed event can update multiple devices/tabs.

Current account-stream server events:

~~~text
sync.required
conversation.created
message.created
messages.read
notification.created
~~~

`sync.required` is sent immediately after a successful socket connection. It tells clients to refetch authoritative REST state rather than assuming the socket has replayed events missed while offline. Messaging clients refetch conversation/history/read state; notification clients must also refetch notification list/unread state when FE-NOTIF is implemented.

Client-to-server WebSocket writes are deliberately unsupported. `ping` receives `pong`; other application messages receive a `rest_write_required` error. All domain mutations continue through REST.

Delivery rules:

- REST/PostgreSQL is the source of truth;
- WebSocket carries delivery events only;
- events are scheduled with `transaction.on_commit`;
- reconnect must refetch server state;
- there is no replay log in Redis;
- missing a realtime event must never lose a persisted Message;
- Redis unavailability may temporarily remove live delivery, but must not turn a successful database write into a failed or missing Message.

# Part C — Notifications

## 9. Persistent in-app notifications — implemented

NOTIF-001 adds PostgreSQL-backed, per-user in-app notifications. NOTIF-RT layers best-effort live delivery on top. The persisted Notification row and REST API remain authoritative.

Implemented notification types:

- `message_received`;
- `creator_followed`;
- `comment_received`;
- `idea_hidden`;
- `idea_restored`.

`creator_published` is deliberately deferred. Followed-creator publishing requires fan-out/batching and preference decisions that should not be hidden inside the first persistence checkpoint.

Authenticated REST endpoints:

~~~text
GET  /api/v1/notifications/
GET  /api/v1/notifications/unread-count/
POST /api/v1/notifications/<notification_id>/read/
POST /api/v1/notifications/read-all/
~~~

The list is cursor-paginated. Read mutations continue to use Django session authentication and CSRF.

Recipient privacy is strict:

- list and unread count query only the authenticated recipient's rows;
- mark-one-read filters by both notification id and recipient, returning 404 to another account;
- mark-all-read updates only the authenticated recipient's unread rows;
- serialized actors expose only id and display name;
- moderation hide/restore notifications do not expose the moderator as an actor;
- `comment_received` carries only `comment_id` and `idea_id`, never the comment body or preview;
- clients navigate/refetch authoritative domain content instead of treating notification payloads as copies of private/content state.

Notification persistence is atomic with the domain mutation that creates it:

- sending a Message creates `message_received` for the other participant;
- first-time CreatorFollow creation creates `creator_followed` for the creator account;
- Comment creation creates `comment_received` for the idea creator, except self-comments;
- direct idea hide creates `idea_hidden` for the idea creator;
- direct idea restore creates `idea_restored` for the idea creator.

If notification insertion raises inside one of these atomic services, the paired domain mutation rolls back. After a successful commit, NOTIF-RT schedules a separate best-effort delivery event through the existing account-level Channels/Redis path. Notification persistence itself remains PostgreSQL state inside the transaction.

Schema migration:

~~~text
notifications.0001_initial
~~~

## 10. Notification preferences

Per-type notification preferences are not implemented in NOTIF-001.

When added, preferences should be server-side so they follow the account across devices. Preference behavior must be decided before adding fan-out notification types.

## 11. Realtime notification delivery — implemented

NOTIF-RT reuses the existing session-authenticated account WebSocket rather than creating a second notification socket.

Route:

~~~text
/ws/messaging/
~~~

Each authenticated session already joins only:

~~~text
messaging.user.<user_id>
~~~

That same recipient-scoped group now carries both messaging events and notification delivery events. No client may select an arbitrary user id/group, and Moderator/Admin status does not grant access to another account's stream.

A successfully persisted Notification schedules this post-commit event:

~~~json
{
  "type": "notification.created",
  "notification_id": 123,
  "notification_type": "message_received"
}
~~~

The WebSocket payload is intentionally minimal. It does not include comment text, message text, Idea body, email, moderator identity, the full Notification serializer, or private conversation content. The receiving frontend should invalidate/refetch the REST notification list and unread count.

Delivery sequence:

~~~text
domain mutation + Notification row
        │
        ▼
PostgreSQL COMMIT
        │
        ▼
transaction.on_commit(...)
        │
        ▼
shared account realtime publisher
        │
        ▼
Channels / Redis
        │
        ▼
messaging.user.<recipient_user_id>
        │
        ▼
all active authenticated recipient sessions
~~~

Failure/reconnect rules:

- PostgreSQL Notification state remains authoritative;
- notification delivery is best-effort only;
- Redis/channel-layer failure is logged and contained after commit;
- a committed domain mutation and Notification row remain available through REST if live delivery fails;
- reconnect sends `sync.required`; there is no durable WebSocket replay log;
- clients recover notification list/unread state by refetching REST;
- multiple active sessions for one recipient receive the same `notification.created` event.

NOTIF-RT does not add realtime events for mark-one-read or mark-all-read. Cross-device read-state realtime is deferred; clients can reconcile through REST/refetch.

## 12. Batching and other notification delivery

The source specifically asks for new ideas from followed creators to be batched into one notification.

That behavior and `creator_published` remain deferred. Do not add Celery in advance; choose grouped synchronous persistence or background processing only when measured product needs justify it.

Web Push, browser Push API/VAPID, service-worker push handlers, OS notification prompts, FCM, and Background Sync are not part of NOTIF-RT. The current scope is in-app realtime delivery while an authenticated PWA/web session is open.

# Part D — Text-to-Speech

## 13. Requirement

Source material requires:

- Play to hear an idea;
- playback progress;
- scrubbing;
- voice choice;
- accessible UI independently of TTS.

## 14. Important distinction

TTS is not an LLM feature.

The simplest implementation may use browser/device Web Speech APIs where supported.

Potential advantages:

- no TTS server;
- no generated-audio storage;
- no API cost;
- device voices.

Potential limitations:

- voice availability differs;
- Persian voice quality/availability differs;
- exact seek/scrub behavior is inconsistent;
- old browser support varies;
- playback behavior differs across platforms.

## 15. TTS decision is intentionally deferred

Before implementing, build a small compatibility prototype on:

- an older Android browser/device;
- an older iPhone/Safari if available;
- current desktop browsers.

Then choose:

### Option A — Browser/device TTS

Preferred if it satisfies enough requirements.

### Option B — Pre-generated server audio

Only if consistent progress/scrubbing/voice behavior is required and browser TTS cannot provide it.

Option B adds storage/delivery complexity.

## 16. Accessibility independence

NFR-16 states accessibility is independent of TTS.

Therefore screen-reader support, semantic HTML, keyboard access, focus behavior, labels and contrast must work even when TTS is unavailable.
