# Frontend Handoff

- Current task: FE-DM — Reader ↔ Creator Messaging UI + Realtime Integration.
- Starting checkpoint: `38e6f052f98020be035d4291125cc648b4bfc297`.
- FE-DM implementation commit: `22b79c3f48fcbd9ee4d714d8af5ccb84799dfed6`.
- Status: IMPLEMENTED, VERIFIED and checkpointed.
- Backend API/WebSocket contract was not redesigned.
- New frontend dependencies: none.

## User-visible additions

Routes:

- `/messages`
- `/messages/:conversationId`

Creator profile:

- authenticated non-self readers can choose **Message Creator**;
- conversation creation uses backend canonical/idempotent behavior.

Messaging UI:

- paginated conversation list;
- last-message preview/time;
- unread count;
- paginated chronological history;
- incoming/outgoing bubbles;
- read state for outgoing messages;
- load/error/empty/not-found states;
- received-message reporting;
- responsive desktop/tablet/mobile behavior;
- Persian RTL and English LTR.

## REST integration

Consumed endpoints:

- `GET /api/v1/conversations/`
- `POST /api/v1/conversations/`
- `GET /api/v1/conversations/{id}/messages/`
- `POST /api/v1/conversations/{id}/messages/`
- `POST /api/v1/conversations/{id}/read/`
- `POST /api/v1/messages/{id}/report/`

Message body limit: 4000 characters.

Conversation cursor page size remains backend-owned at 20.
Message-history cursor page size remains backend-owned at 50.

## WebSocket integration

Path:

`/ws/messaging/`

Authentication:

- existing Django session/cookie;
- no JWT;
- no client-selected group subscription.

One account-level socket is mounted from the persistent authenticated shell.

Backend events are notification signals only:

- `conversation.created`;
- `message.created`;
- `messages.read`;
- `sync.required`.

Frontend responds with targeted React Query invalidation/refetch rather than domain writes or durable replay.

Reconnect uses bounded 1s / 2s / 5s / 10s backoff.

A real backend restart smoke confirmed:

- reconnecting UI state;
- successful reconnect;
- `sync.required`;
- authoritative REST refetch of both conversation list and open message history.

A `4401` auth close clears the cached session and stops reconnecting until authentication is restored.

## Read/unread

Opening an unread conversation posts to its read endpoint.

The frontend keys read attempts to the observed conversation/unread/last-message state to avoid repeated read POSTs.

Successful read state updates the list and then refetches authoritative state.

Live `messages.read` invalidates both the conversation list and affected message history.

## Reporting/privacy

Received messages only expose report controls.

Existing moderation reasons and 2000-character optional details are reused.

Moderator report detail now supports backend `target_message` and shows only the single reported message.

It deliberately does not:

- link to the private conversation;
- expose the full private thread;
- provide moderator conversation access;
- provide a message hide/delete action the backend does not define.

## Verification

Final frontend gate:

- TypeScript PASS.
- ESLint PASS.
- Vitest PASS — 60 files / 250 tests.
- production build PASS — 203 modules.
- Prettier PASS.
- runtime npm audit PASS — 0 vulnerabilities.
- git diff check PASS.
- MessagingPage lazy chunk — 13.89 KB / 3.89 KB gzip.
- main entry — 319.57 KB / 96.13 KB gzip.
- no >500 KB Vite chunk warning.

Focused FE-DM coverage is documented in `docs/ai/frontend/tasks/FE-DM.md`.

Real two-session Chromium smoke passed:

- Reader starts conversation;
- Creator receives live conversation;
- Reader sends via REST;
- Creator receives live message;
- unread badge changes;
- opening thread clears unread;
- read state propagates;
- Creator replies;
- Reader receives live reply;
- Reader reports received message;
- refresh preserves history;
- reconnect causes REST synchronization;
- Persian RTL;
- English LTR;
- 390px compact layout/no horizontal overflow.

## Important unrelated backend edit

Preserve exactly:

`backend/content/language_filters.py`

FE-DM never touched or staged it.

Recorded SHA-256:

`0806f1a45c9480c362844b7fc7ebbaa8635a19a7bd37830f444ea0f5fab0a781`

Because that unrelated working-tree edit currently raises an `IndentationError`, live browser integration used an isolated temporary export of committed backend `38e6f05`. The export and all smoke data/services were removed afterward.

## Next

Frontend messaging is ready for staging/deployment integration against the same backend contract.
