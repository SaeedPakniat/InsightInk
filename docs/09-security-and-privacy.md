# 09 — Security, Privacy and Moderation

## 1. Security scope

InsightInk handles:

- accounts;
- passwords through Django auth;
- saved/reading behavior;
- personalization interests;
- comments;
- reports;
- direct messages later;
- membership/payment references later.

Security is part of implementation, not a final patch.

## 2. Authentication security

Use Django password handling.

Rules:

- never store plaintext passwords;
- never log passwords;
- never send credentials in query strings;
- require HTTPS in production;
- use secure reset flows;
- validate account state on protected endpoints.

## 3. Authorization

Every protected operation needs both authentication and authorization.

Examples:

- login does not allow editing another creator's idea;
- Moderator is not Admin;
- Creator cannot edit another creator's content;
- conversations are not visible to non-participants.

## 4. Input validation

Validate user-controlled input server-side.

Examples:

- comment length/content;
- profile fields;
- source URLs;
- uploads if added;
- pagination;
- filters/sort values.

Frontend validation improves UX but is not the security boundary.

Account avatar uploads are validated server-side with Pillow rather than by file
extension. Only JPEG, PNG, and WebP content up to 5 MiB is accepted; GIF and other
formats, corrupt data, and oversized files are rejected. The database stores a
storage-relative name, while physical files use Django's configured storage.
Replacement/removal schedules deletion of the previous object after transaction
commit so a failed validation or database update cannot destroy the current
avatar.

## 5. Web security concepts

Django security features should be configured rather than bypassed.

Important topics to learn:

- CSRF;
- CORS;
- cookies;
- SameSite;
- XSS;
- clickjacking;
- secure headers.

Exact settings depend on final frontend/API origin deployment.

## 6. NFR-12 privacy

Source requires GDPR/CCPA-style handling of reading history, saves and personalization data, including export/deletion on request.

For this bachelor project the design should allow:

- identifying user-owned personal data;
- exporting meaningful account data;
- deletion/anonymization according to a documented policy;
- avoiding unnecessary personal-data collection.

Do not claim legal compliance merely because features exist.

## 7. Direct-message privacy

NFR-13 requires:

- encrypted transport through HTTPS/WSS;
- access restricted to conversation participants.

If reported-message moderation exists, moderation access must be explicit.

End-to-end encryption is not required by the source and is not current scope.

## 8. Payment security

NFR-14 requires no raw card data on InsightInk servers.

If payment is implemented:

- use an external payment provider;
- store provider references and subscription status only;
- verify provider callbacks/webhooks;
- never store card number/CVV.

## 9. Moderation model

Reports may target:

- comments;
- users/creators;
- messages/conversations when applicable;
- published ideas if needed.

Moderators take bounded safety actions. Admin manages moderators.

## 10. Report lifecycle

Suggested:

~~~text
OPEN
  ↓
REVIEWING
  ├── RESOLVED
  └── REJECTED
~~~

A moderation action should record:

- actor;
- target;
- action;
- timestamp;
- optional reason.

## 11. Block and mute

NFR-15 requires report/block/mute.

### Block

Should restrict unwanted interaction, especially messaging.

### Mute

Reduces visibility/notifications without necessarily imposing the stronger restriction of Block.

Exact semantics are fixed during messaging design.

## 12. Abuse controls

Potential targets:

- login attempts;
- account creation;
- comments;
- reports;
- direct messages;
- search.

Do not create a distributed rate-limiter on day one. Add the simplest adequate control when the relevant feature exists.

## 13. Secrets

Never commit:

- Django secret key;
- database password;
- email/provider secrets;
- payment secrets;
- production API keys.

Use environment variables and provide a safe .env.example later.

## 14. Logging

Logs should aid debugging without leaking sensitive data.

Avoid logging:

- passwords;
- auth secrets;
- raw payment data;
- unnecessary full private-message contents.

## 15. Security Definition of Done

A feature is incomplete until:

- permission rules are tested;
- invalid input is tested;
- unauthorized access is tested;
- ownership is tested;
- errors do not leak sensitive internals.
