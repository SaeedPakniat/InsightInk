# Frontend Handoff

- Task: FE-025 — Installable PWA and Safe Offline Fallback.
- Accepted base: `5c6352d70d1db329e544361f832074fd6e509f93`.
- Result: ACCEPTED by user; checkpointed in the FE-025 commit containing this handoff.
- Backend implementation unchanged.
- No dependency addition.

## PWA implementation

Added:

- manifest;
- install icons;
- Apple touch icon;
- production-only service-worker registration;
- service worker;
- bilingual offline page;
- deterministic Chromium PWA smoke.

## Cache policy

Precache:

- manifest/icons/favicon/offline page.

Runtime cache:

- same-origin `/assets/` only;
- maximum 40 entries.

Network-only:

- all `/api/`;
- personalized account/content data.

Navigation:

- online network-first;
- network failure -> cached `offline.html`.

No stale personalized API replay is implemented.

## PWA browser evidence

Chromium 157 production smoke PASS:

- manifest errors 0;
- installability errors 0;
- service worker activated at root scope;
- 7 precache entries;
- 14 runtime hashed assets observed;
- 0 cached API paths;
- Persian/English offline fallback and retry control verified.

## Unit and regression evidence

- service-worker registration: 4 focused tests PASS.
- full Vitest: 54 files / 221 tests PASS.
- TypeScript PASS.
- ESLint PASS.
- build PASS.
- FE-023/024 hardening PASS.
- PWA smoke PASS.
- Prettier PASS.
- runtime audit: 0 vulnerabilities.
- git diff check PASS.
- package-lock unchanged.

## Platform evidence

- Chromium 157 desktop installability PASS.
- Firefox 160 production render remains PASS.
- physical Android/iOS PWA installation remains unverified and must not be claimed.

## Deployment note

Production needs HTTPS and root-served `service-worker.js`.

Prefer revalidation/no-cache semantics for the service-worker script so updates are detected promptly.

## Pending

- Next: FE-026 final frontend completion/release-readiness audit and handoff.
