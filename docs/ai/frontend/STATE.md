# Frontend State

- Task: FE-DM — Reader ↔ Creator Messaging UI + Realtime Integration.
- Status: ACCEPTED by implementation brief; IMPLEMENTED, VERIFIED and checkpointed.
- Starting repository checkpoint: `38e6f052f98020be035d4291125cc648b4bfc297`.
- FE-DM implementation checkpoint: `22b79c3f48fcbd9ee4d714d8af5ccb84799dfed6`.
- Branch: `master`; starting HEAD matched `origin/master`.
- Backend messaging source of truth: committed backend at `38e6f05`.
- New npm dependencies: none.

## Delivered

FE-DM reopens frontend work for explicit post-FE-026 product scope.

Authenticated messaging routes:

- `/messages`
- `/messages/:conversationId`

Reader entry point:

- public Creator profile exposes **Message Creator** for authenticated non-self viewers;
- conversation creation uses backend `POST /api/v1/conversations/` with `creator_id`;
- backend canonical/idempotent conversation behavior is preserved;
- no generic user-to-user messaging UI exists.

Messaging workspace:

- cursor-paginated conversation list;
- safe Reader/Creator identity summaries and available avatar fields;
- latest-message preview;
- updated/latest-message time;
- unread count/state;
- loading, retry, empty and not-found states;
- selected conversation state;
- cursor-paginated message history rendered oldest → newest;
- distinct outgoing/incoming message presentation;
- responsive list → detail behavior on compact screens;
- two-column layout on wider screens;
- Persian RTL / English LTR.

Writes remain REST-only:

- send: `POST /api/v1/conversations/{id}/messages/`;
- read: `POST /api/v1/conversations/{id}/read/`;
- report: `POST /api/v1/messages/{id}/report/`.

Message composer:

- 4000-character boundary;
- trimmed REST submission;
- localized validation/errors;
- Enter sends and Shift+Enter inserts a line;
- authoritative Message IDs prevent duplicate rendering.

## Realtime

One authenticated account-level socket is mounted from the persistent application shell:

- path: `/ws/messaging/`;
- Django session/cookie authentication;
- no JWT/token invention;
- no per-conversation sockets;
- no WebSocket domain writes.

Event handling:

- `conversation.created` → invalidate/refetch conversation list;
- `message.created` → invalidate conversation list + relevant message history;
- `messages.read` → invalidate conversation list + relevant message history;
- `sync.required` → invalidate/refetch messaging REST queries.

Reconnect:

- bounded 1s / 2s / 5s / 10s backoff;
- REST messaging remains usable when realtime is unavailable;
- reconnect relies on backend `sync.required` + authoritative REST refetch;
- no durable client event replay;
- backend close code `4401` clears the cached session, stops reconnecting and waits for session restoration/login;
- logout/session removal closes the socket and cancels pending reconnect timers.

Development Vite now proxies `/ws` to the configured backend with `ws: true`.

## Read/unread behavior

Opening a conversation with incoming unread messages calls the read endpoint once for the observed unread state.

Successful read:

- updates local conversation unread state immediately;
- refetches conversation/message state;
- backend `messages.read` propagates the authoritative state to the other participant.

Repeated render does not spam the read endpoint for the same unread key.

## Reporting and moderation integration

Only received messages expose the report UI.

The report form reuses existing moderation reasons:

- harassment;
- spam;
- inappropriate content;
- other.

Details are optional, trimmed and bounded by the existing 2000-character backend/UI rule.

FE-DM also closes the moderator-detail integration gap introduced by message reports:

- `ModerationReportDetail` now includes backend `target_message`;
- moderator detail renders only the single reported message returned by the report endpoint;
- no link or UI access to the private conversation is exposed;
- message-report review copy does not suggest comment-hiding;
- normal start-review / resolve / reject workflow remains available.

## Automated verification

Focused FE-DM coverage includes:

- REST endpoint/payload/cursor contract;
- conversation deduplication;
- chronological message presentation;
- authoritative Message-ID deduplication;
- conversation list/empty/unread states;
- opening a conversation;
- message history;
- REST sending;
- 4000-character validation;
- read endpoint behavior;
- recipient-only message reporting;
- privacy-preserving 404 handling;
- Creator start-conversation action and self suppression;
- `message.created`;
- `conversation.created`;
- `messages.read`;
- `sync.required`;
- bounded reconnect;
- `4401` session loss;
- logout/session socket cleanup;
- Persian RTL / English LTR;
- moderator display of reported message without private-conversation access.

Final checkpoint gate:

- TypeScript PASS.
- ESLint PASS.
- Vitest PASS — 60 files / 250 tests.
- production build PASS — 203 modules.
- CSS — 141.23 KB / 17.55 KB gzip.
- MessagingPage lazy chunk — 13.89 KB / 3.89 KB gzip.
- main entry — 319.57 KB / 96.13 KB gzip.
- no >500 KB Vite chunk warning.
- Prettier PASS.
- runtime npm audit PASS — 0 vulnerabilities.
- git diff check PASS.

## Browser/integration evidence

Real two-session Chromium 157 smoke used isolated Reader and Creator browser profiles against:

- live FE-DM Vite frontend;
- PostgreSQL;
- Redis 8;
- backend code exported from committed `38e6f05`.

Verified end-to-end:

1. Creator opened `/messages` first and realtime connected.
2. Reader opened Creator profile and started canonical conversation.
3. Creator received `conversation.created` live without reload.
4. Reader sent through REST.
5. Creator received the message live and unread badge became 1.
6. Creator opened the thread; read endpoint cleared unread.
7. Reader received updated read state.
8. Creator replied; Reader received live reply.
9. Reader reported the received message through the real report UI.
10. Refresh preserved full PostgreSQL history.
11. 390px English LTR and Persian RTL layouts had no horizontal overflow.
12. Compact selected-thread layout hid the conversation list as designed.

Persisted smoke evidence before cleanup:

- exactly 2 Message rows;
- both messages obtained `read_at`;
- the report existed as an open message-target harassment report;
- report details were trimmed.

Reconnect smoke:

- UI changed connected → reconnecting → connected;
- reconnect backend `sync.required` caused real GET refetches of:
  - `/api/v1/conversations/`;
  - `/api/v1/conversations/{id}/messages/`.

All temporary smoke accounts, reports, Redis container, browser profiles, exported backend and temporary files were removed after verification.

## Backend working-tree preservation

An unrelated pre-existing edit remains:

`backend/content/language_filters.py`

It was never touched, staged, reset, stashed or cleaned by FE-DM.

Its SHA-256 remained:

`0806f1a45c9480c362844b7fc7ebbaa8635a19a7bd37830f444ea0f5fab0a781`

That unrelated working-tree file currently has an `IndentationError` at line 1, so the browser smoke deliberately ran the backend from a temporary `git archive` export of committed `38e6f05`. This preserved the unrelated edit exactly while still testing against the verified backend source of truth.

## Remaining limitations

- Messaging is deliberately Reader ↔ Creator only.
- WebSocket is notification/synchronization transport only; all writes remain REST.
- No moderator route to private conversations exists.
- No shell-level global unread badge was added; unread state is shown in the messaging conversation list.
- Physical mobile-device/browser validation remains outside this checkpoint; responsive Chromium coverage is complete for the requested desktop/compact states.
