# 07 — Realtime, Notifications and Text-to-Speech

These capabilities are later phases. They are documented now so the core schema and API do not block them.

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

Initial direct messaging is between Reader and Creator.

It is not a general reader-to-reader messenger.

## 6. Message persistence

~~~text
Client
  │
  ▼
authenticated server action
  │
  ▼
store Message in PostgreSQL
  │
  ▼
deliver realtime event to active participant
~~~

Message history always comes from the database.

## 7. Authorization

Only conversation participants may access messages.

Moderators do not casually browse private conversations. Moderation access, if implemented, must be tied to a safety/report workflow.

NFR-13 requires encrypted transport; production uses HTTPS/WSS.

# Part C — Notifications

## 8. Notification types

Potential in-app events:

- save/sync status;
- creator follow activity;
- reply to comment;
- creator message;
- batched new ideas from followed creators;
- moderation outcome where relevant.

## 9. Notification preferences

Users must be able to disable specific notification types.

Preferences are server-side so they follow the account across devices.

## 10. Batching

The source specifically asks for new ideas from followed creators to be batched into one notification.

The first implementation does not require complex distributed job infrastructure.

Possible approaches when the phase begins:

1. grouped in-app notification during normal processing;
2. scheduled/background processing only if the feature actually needs it.

Do not add Celery in advance.

# Part D — Text-to-Speech

## 11. Requirement

Source material requires:

- Play to hear an idea;
- playback progress;
- scrubbing;
- voice choice;
- accessible UI independently of TTS.

## 12. Important distinction

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

## 13. TTS decision is intentionally deferred

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

## 14. Accessibility independence

NFR-16 states accessibility is independent of TTS.

Therefore screen-reader support, semantic HTML, keyboard access, focus behavior, labels and contrast must work even when TTS is unavailable.
