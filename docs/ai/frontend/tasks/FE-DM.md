# FE-DM — Reader ↔ Creator Messaging UI + Realtime Integration

- TYPE: explicit new product scope after FE-026.
- STARTING HEAD: `38e6f052f98020be035d4291125cc648b4bfc297`.
- BACKEND SOURCE OF TRUTH: committed messaging + Redis realtime backend at `38e6f05`.
- IMPLEMENTATION COMMIT: `22b79c3f48fcbd9ee4d714d8af5ccb84799dfed6`.
- STATUS: IMPLEMENTED, VERIFIED and checkpointed.
- BACKEND API REDESIGN: none.
- NEW NPM DEPENDENCIES: none.

## Goal

Add the complete user-visible Reader ↔ Creator messaging experience while preserving the locked backend rule:

`REST = writes / authoritative fetch`

`WebSocket = live notification that authoritative server state changed`

Messaging remains Reader ↔ Creator only. FE-DM does not add arbitrary user-to-user chat.

## Routes and entry points

Protected routes:

- `/messages`
- `/messages/:conversationId`

The persistent authenticated shell includes Messages navigation.

Creator profiles add **Message Creator**:

- anonymous users receive the existing login return-path flow;
- authenticated readers can start/open the canonical backend conversation;
- self Creator profiles do not expose the action;
- no generic user picker exists.

## REST contract consumed

### Conversations

`GET /api/v1/conversations/`

- cursor pagination;
- frontend deduplicates by Conversation ID across pages.

`POST /api/v1/conversations/`

Payload:

`{ "creator_id": <CreatorProfile id> }`

The frontend uses the returned canonical Conversation ID regardless of whether the backend created or reused the pair.

### Messages

`GET /api/v1/conversations/{id}/messages/`

- cursor pagination;
- backend returns newest-first pages;
- frontend deduplicates by Message ID and presents chronological oldest → newest history.

`POST /api/v1/conversations/{id}/messages/`

Payload:

`{ "body": "<trimmed body>" }`

- max 4000 characters;
- send remains REST-only;
- successful REST response is inserted by authoritative Message ID;
- later WebSocket invalidation/refetch cannot duplicate that ID.

### Read

`POST /api/v1/conversations/{id}/read/`

Called only when the opened conversation has an observed incoming unread state.

The attempt key includes conversation ID, unread count and last-message ID so ordinary rerenders do not repeatedly POST the same read state.

### Report

`POST /api/v1/messages/{id}/report/`

Only incoming messages render report controls.

Reasons reuse the existing moderation contract:

- harassment;
- spam;
- inappropriate_content;
- other.

Optional details are trimmed and bounded to 2000 characters.

## Conversation UI

Conversation list shows backend-permitted data only:

- counterpart identity;
- available account/Creator avatar;
- last-message excerpt;
- last-message/update time;
- unread badge;
- active state.

States:

- loading;
- retryable load error;
- empty;
- cursor load more.

Thread:

- counterpart identity;
- message body;
- timestamp;
- outgoing read/sent state;
- load older;
- empty conversation;
- private-report action on incoming messages;
- localized composer validation/errors.

Privacy-preserving backend 404 is presented as generic conversation not-found/unavailable.

## Responsive/accessibility behavior

Wide layout:

- conversation list + active thread columns.

Compact layout:

- list screen;
- selected conversation hides list;
- explicit back-to-conversations link.

Verified at 390px:

- English LTR: no horizontal overflow;
- Persian RTL: no horizontal overflow;
- selected conversation list hidden as designed.

Accessibility:

- semantic ordered message history;
- form labels;
- visible existing focus system;
- unread has textual/ARIA count, not color only;
- `dir="auto"` for mixed-language private content;
- realtime connection state uses text + indicator;
- reduced-motion disables realtime pulse animation.

## Realtime architecture

Path:

`/ws/messaging/`

One account-level socket is mounted at the persistent shell.

No per-conversation socket exists.

No WebSocket write API exists in the frontend.

### Events

`conversation.created`

- invalidate/refetch conversation list.

`message.created`

- invalidate/refetch conversation list;
- invalidate/refetch the affected conversation history.

`messages.read`

- invalidate/refetch conversation list;
- invalidate/refetch the affected conversation history.

`sync.required`

- invalidate/refetch the messaging query namespace.

### Reconnect

Backoff:

- 1 second;
- 2 seconds;
- 5 seconds;
- capped at 10 seconds.

REST remains the durable path while realtime is unavailable.

A reconnect does not replay client event history; backend `sync.required` triggers authoritative REST synchronization.

Auth/session loss:

- backend close code `4401` sets realtime disconnected;
- cached session is cleared;
- session query is invalidated;
- reconnect stops until authentication is restored.

Logout/user removal:

- socket closes;
- pending reconnect timer is cleared.

Development Vite proxies `/ws` with WebSocket support to the configured backend target.

## Message-report moderator integration

Backend report detail already returns a bounded `target_message` shape.

FE-DM adds the matching frontend type/rendering:

- message sender display name;
- reported message body;
- message timestamp.

The moderator UI does **not** expose:

- a link to `/messages/:conversationId`;
- conversation history;
- participant-only conversation access;
- a message hide/delete action not defined by backend.

Message-report reviewing copy explicitly instructs the moderator to review only the reported message, then resolve or reject.

## Tests

Focused FE-DM coverage includes:

- exact messaging REST paths and payloads;
- CSRF for unsafe messaging/report requests;
- cursor extraction;
- conversation pagination dedupe;
- message pagination dedupe + chronological ordering;
- REST response + WebSocket duplicate-ID prevention;
- list rendering;
- empty state;
- unread state;
- opening conversation;
- history rendering;
- REST send;
- 4000-character boundary;
- read endpoint behavior;
- received-only report action;
- privacy-preserving 404;
- Creator start action;
- self-profile suppression;
- anonymous login return path;
- all realtime event invalidations;
- reconnect/backoff;
- `sync.required`;
- `4401` session clearing;
- logout/session cleanup;
- Persian RTL;
- English LTR;
- reported-message moderator rendering/privacy.

## Real two-session browser smoke

Environment:

- Chromium 157;
- two isolated user-data profiles;
- PostgreSQL;
- Redis 8;
- live Vite FE-DM frontend;
- backend exported from committed `38e6f05`.

The backend export was necessary because the unrelated dirty working-tree file `backend/content/language_filters.py` currently contains an `IndentationError`. FE-DM did not modify that file.

Flow PASS:

1. Creator loads Messages and socket connects.
2. Reader starts conversation from Creator profile.
3. Creator receives live `conversation.created` without reload.
4. Reader sends through REST.
5. Creator receives live message and unread badge = 1.
6. Creator opens conversation.
7. Read POST clears unread.
8. Reader sees outgoing message become Read.
9. Creator sends reply.
10. Reader receives live reply.
11. Reader reports reply.
12. Refresh preserves both messages.
13. English 390px LTR passes.
14. Persian 390px RTL passes.
15. No horizontal overflow.

Database evidence before cleanup:

- Conversation contained exactly two Message rows.
- Both Message rows had `read_at`.
- Message report existed as an open harassment report.
- Report details were trimmed.

Reconnect PASS:

- connected → reconnecting → connected observed;
- backend reconnect sent `sync.required`;
- browser emitted authoritative REST GETs for conversation list and active message history.

Temporary smoke records, report, Redis container, Chromium profiles, backend export and temporary scripts/screenshots were deleted afterward.

## Unrelated backend preservation

Pre-existing working-tree file:

`backend/content/language_filters.py`

FE-DM never touched/staged/reset/stashed/cleaned it.

Hash before and after smoke:

`0806f1a45c9480c362844b7fc7ebbaa8635a19a7bd37830f444ea0f5fab0a781`

## Final quality gate

Final exact checkpoint verification:

- `npm run typecheck`: PASS.
- `npm run lint`: PASS.
- `npm test`: PASS — **60 files / 250 tests**.
- `npm run build`: PASS — **203 modules transformed**.
- CSS: **141.23 KB / 17.55 KB gzip**.
- MessagingPage lazy chunk: **13.89 KB / 3.89 KB gzip**.
- main entry: **319.57 KB / 96.13 KB gzip**.
- no chunk exceeded 500 KB; no Vite chunk-size warning.
- `npm run format:check`: PASS.
- `npm audit --omit=dev`: PASS — **0 vulnerabilities**.
- `git diff --check`: PASS.

## Remaining limitations

- Reader ↔ Creator only by product design.
- No generic user-to-user chat.
- No WebSocket writes.
- No moderator private-conversation access.
- No shell-level aggregate unread badge; per-conversation unread state is implemented.
- Physical mobile-device validation is outside this checkpoint; responsive Chromium compact coverage passed.
