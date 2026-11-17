# 07 — Realtime, Notifications and Text-to-Speech

Messaging realtime is now implemented. Notifications, broader Save/Library live sync, and TTS remain later phases; this document keeps their shared architecture explicit.

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

Current server events:

~~~text
sync.required
conversation.created
message.created
messages.read
~~~

`sync.required` is sent immediately after a successful socket connection. It tells the frontend to refetch REST state rather than assuming the socket has replayed events missed while offline.

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

## 9. Notification types

Potential in-app events:

- save/sync status;
- creator follow activity;
- reply to comment;
- creator message;
- batched new ideas from followed creators;
- moderation outcome where relevant.

## 10. Notification preferences

Users must be able to disable specific notification types.

Preferences are server-side so they follow the account across devices.

## 11. Batching

The source specifically asks for new ideas from followed creators to be batched into one notification.

The first implementation does not require complex distributed job infrastructure.

Possible approaches when the phase begins:

1. grouped in-app notification during normal processing;
2. scheduled/background processing only if the feature actually needs it.

Do not add Celery in advance.

# Part D — Text-to-Speech

## 12. Requirement

Source material requires:

- Play to hear an idea;
- playback progress;
- scrubbing;
- voice choice;
- accessible UI independently of TTS.

## 13. Important distinction

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

## 14. TTS decision is intentionally deferred

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

## 15. Accessibility independence

NFR-16 states accessibility is independent of TTS.

Therefore screen-reader support, semantic HTML, keyboard access, focus behavior, labels and contrast must work even when TTS is unavailable.
