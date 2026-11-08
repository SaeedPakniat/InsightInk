# 05 — API, Authentication and Roles

## 1. API style

InsightInk uses REST over HTTPS.

Base path:

```text
/api/v1/
```

Data format:

```text
application/json
```

## 2. HTTP conventions

- GET — retrieve data;
- POST — create data or trigger a non-idempotent action;
- PUT/PATCH — update;
- DELETE — remove/deactivate relationship;
- meaningful HTTP status codes;
- consistent validation-error structure.

## 3. Planned endpoint groups

### Authentication / account

```text
POST   /api/v1/auth/register/
POST   /api/v1/auth/login/
POST   /api/v1/auth/logout/
GET    /api/v1/me/
PATCH  /api/v1/me/
PUT    /api/v1/me/avatar/
DELETE /api/v1/me/avatar/
GET    /api/v1/me/interests/
PUT    /api/v1/me/interests/
```

These are the canonical auth/account routes. Their HTTP behavior is implemented in
the authentication API milestone.

`GET /me/` returns the safe current-account representation with a nullable,
frontend-usable `avatar_url` and bounded capability flags. `PATCH /me/` accepts
only `display_name` and `preferred_ui_language`, using partial-update semantics.
Avatar writes are isolated to the multipart `PUT /me/avatar/` endpoint; `DELETE`
is idempotent. Uploads accept verified JPEG, PNG, or WebP content up to 5 MiB.
Replacement and removal delete the old object through Django storage only after
the database transaction commits. All unsafe account routes retain session
authentication and CSRF protection.

### Feed and ideas

```text
GET    /api/v1/feed/
GET    /api/v1/ideas/{id}/
GET    /api/v1/ideas/{id}/related/
```

Feed uses cursor-style pagination when implementation reaches that stage.

### Engagement

```text
PUT    /api/v1/ideas/{id}/spark/
DELETE /api/v1/ideas/{id}/spark/

PUT    /api/v1/ideas/{id}/save/
DELETE /api/v1/ideas/{id}/save/

GET    /api/v1/ideas/{id}/comments/
POST   /api/v1/ideas/{id}/comments/
DELETE /api/v1/comments/{id}/
POST   /api/v1/comments/{id}/report/
```

Spark and Save should be idempotent.

### Library

```text
GET    /api/v1/library/saved/
GET    /api/v1/library/stats/
```

eBook/membership endpoints are designed when that phase begins.

### Creators

```text
GET    /api/v1/creators/
GET    /api/v1/creators/{id}/
PUT    /api/v1/creators/{id}/follow/
DELETE /api/v1/creators/{id}/follow/
```

### Explore/search

```text
GET    /api/v1/search/?q=...
GET    /api/v1/topics/
GET    /api/v1/topics/{slug}/ideas/
```

### Recommendations

```text
GET    /api/v1/recommendations/
GET    /api/v1/ideas/{id}/related/
```

There is no chat/completion endpoint because the recommendation system is not an LLM.

### Moderation

```text
GET  /api/v1/moderation/ideas/?status=hidden
POST /api/v1/moderation/ideas/{id}/restore/
```

The hidden-Idea workspace is available only to users accepted by the existing
`IsModeratorOrAdmin` permission. The `status` query parameter is required and its
only supported value is `hidden`; missing or unsupported values return HTTP 400.
It is not a general private-Idea browser and never exposes drafts, published
Ideas, or creator-withdrawn Ideas.

The list uses DRF cursor pagination with a page size of 25 and deterministic
ordering by `-updated_at,-id`. Each result is intentionally bounded to
`id`, `title`, `body_excerpt`, `language`, `status`,
`creator{id,display_name}`, `source{id,type,title}`, `published_at`, and
`updated_at`. `body_excerpt` is the complete body up to 240 Unicode characters;
longer bodies use `body[:239] + "…"`. The existing restore action remains the
authoritative `hidden -> published` transition, so a restored Idea naturally
disappears from subsequent hidden-workspace queries.

## 4. Authentication design

Requirements include account creation and login on another device.

Authentication must support:

- secure password hashing through Django;
- login/logout;
- email-based identity;
- password reset;
- optional social login if retained in final scope;
- authenticated API access.

The locked authentication foundation is:

- Django session/cookie authentication through DRF `SessionAuthentication`;
- preferred same-origin frontend and API deployment;
- secure HttpOnly session cookies in production;
- CSRF protection remains enabled;
- required, unique email as the canonical login identity;
- `AbstractUser` retained with its `username` field removed.

JWT, DRF token authentication, custom bearer/refresh tokens, and OAuth/social
authentication are not part of the locked foundation. Password reset and any future
social authentication remain separate, later work.

## 5. Authorization model

Authentication answers:

> Who are you?

Authorization answers:

> What are you allowed to do?

Do not mix them.

## 6. Roles

### Reader

Can:

- browse/read;
- save/spark;
- comment;
- follow;
- message creators when messaging exists;
- manage own profile/interests;
- report/block/mute according to implemented features.

### Creator

A user with creator capabilities.

Can additionally:

- maintain creator profile;
- create/manage own ideas when creator publishing UI/API is implemented;
- view own public metrics;
- receive/reply to direct messages.

Creator permissions must be object-aware: creators can edit their own content, not arbitrary creators' content.

### Moderator

Can perform defined safety/moderation actions such as:

- view reports;
- review reported content;
- hide/remove inappropriate comments/content;
- resolve reports;
- apply limited account restrictions if implemented.

Cannot:

- appoint moderators;
- create admins;
- change unrestricted system settings.

### Admin

Has full system administrative access.

Only Admin can assign/remove Moderator status.

## 7. Django permission strategy

Prefer Django's existing concepts:

- Groups;
- Permissions;
- `is_staff`;
- `is_superuser`;
- object ownership checks.

Avoid inventing a second independent authorization framework.

Likely mapping:

```text
Reader      → authenticated user
Creator     → authenticated user + CreatorProfile + creator permissions
Moderator   → Moderator group / staff access with limited permissions
Admin       → superuser / full administrative permissions
```

## 8. Object-level rules

Examples:

- a user can edit only their own profile;
- a creator can modify only their own ideas;
- a user can delete only their own comment unless moderator/admin;
- only conversation participants may fetch messages;
- a blocked relationship must affect messaging behavior;
- only admin can grant moderator role.

These rules require explicit tests.

## 9. API security basics

Every modifying endpoint must consider:

- authentication requirement;
- permission check;
- object ownership;
- validation;
- rate/abuse considerations;
- safe error response;
- audit need.

## 10. API documentation

When DRF endpoints exist, generate and maintain an OpenAPI schema.

Frontend types may later be generated from the schema, but only after the API becomes stable enough to make that useful.

The OpenAPI document should become the machine-readable API contract; these markdown files remain the human-readable architecture contract.
