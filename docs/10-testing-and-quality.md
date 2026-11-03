# 10 — Testing and Quality Strategy

## 1. Testing philosophy

Tests exist to protect behavior and architectural rules, not to chase a meaningless coverage percentage.

Critical product rules should be testable from the beginning.

## 2. Test pyramid

Use multiple levels:

~~~text
Many fast unit tests
        ↓
Service/model/API integration tests
        ↓
Fewer end-to-end tests
~~~

Do not make every test an expensive browser test.

## 3. Backend unit tests

Good candidates:

- recommendation score calculations;
- Jaccard similarity;
- permission helper functions;
- model validation;
- utility functions;
- language/filter logic.

Pure functions should be preferred where practical because they are easy to test.

## 4. Django/DRF integration tests

Test:

- model constraints;
- serializers;
- API status codes;
- authentication;
- pagination;
- filtering;
- database writes;
- ownership rules;
- moderator/admin boundaries.

Examples:

~~~text
Anonymous user tries to save → rejected
Authenticated user saves → created
Same user saves again → no duplicate
Other user cannot delete my comment
Moderator can hide reported comment
Moderator cannot grant moderator role
Admin can grant moderator role
~~~

## 5. Recommendation tests

At minimum:

- declared interests affect ranking;
- save/spark history affects ranking;
- language preference affects candidates;
- followed creator affects ranking;
- consumed-content penalty works;
- cross-format candidate can surface;
- explanation matches actual score reason;
- identical inputs produce deterministic result.

## 6. Frontend component tests

Use React Testing Library philosophy: test behavior visible to the user.

Examples:

- IdeaCard displays title/source/time;
- Save toggles visible state;
- loading/error/empty states render;
- Persian mode sets correct direction;
- controls have accessible names.

Avoid tests that depend excessively on internal component implementation.

## 7. End-to-end flows

Playwright is introduced after real frontend/backend integration exists.

Critical flows:

### Flow A — onboarding

~~~text
Register
→ choose Persian/English UI
→ choose interests
→ reach feed
~~~

### Flow B — core engagement

~~~text
Login
→ open feed
→ open idea
→ spark
→ save
→ comment
→ view saved item in library
~~~

### Flow C — creator

~~~text
Open creator
→ follow
→ verify followed state
~~~

### Flow D — authorization

~~~text
Normal user cannot access moderation action
Moderator can process report
Moderator cannot assign moderator
Admin can manage moderator
~~~

### Flow E — realtime later

~~~text
Device/session A saves
→ session B receives/refetches state
→ sync latency is measured
~~~

## 8. NFR measurement plan

### NFR-01 — UI under 100 ms

Measure perceived/local interaction where appropriate.

Optimistic UI can satisfy immediate response for Save/Spark while network confirmation occurs separately.

### NFR-02 — next page under 300 ms

Measure API and frontend fetch under a defined “normal network” test setup.

Record:

- server response;
- payload size;
- client rendering.

### NFR-03 — concurrent users

Use controlled load testing when the API is stable.

The source says thousands of users. For the bachelor project, test progressively and document the tested limit rather than pretending production-scale certification.

### NFR-05 — sync within 2 seconds

Measure:

~~~text
database commit timestamp
→ receiving client state update timestamp
~~~

Run repeated tests and report distribution, not one successful sample.

### NFR-06 — 99.9% uptime

This is difficult to prove within a student project.

Treat it as a design target and document deployment/monitoring assumptions. Do not claim a measured annual SLA without evidence.

### NFR-07 — low idle resource use

Use browser/devtools/system observation on representative devices.

### NFR-08 — CDN

If the academic deployment uses no CDN, state that the NFR is not fully realized. Do not fake compliance.

### NFR-16 — accessibility

Use manual + automated checks.

### NFR-17 — suggestions under 2 seconds

Measure recommendation endpoint execution with realistic test data.

No network call to an LLM exists.

## 9. Compatibility testing matrix

Maintain a table during frontend development:

| Device/Browser | Core | PWA install | TTS | Realtime | Notes |
|---|---|---|---|---|---|
| Old Android target | TBD | TBD | TBD | TBD | |
| Old iOS target | TBD | TBD | TBD | TBD | |
| Current Android | TBD | TBD | TBD | TBD | |
| Current desktop Chrome | TBD | N/A | TBD | TBD | |
| Firefox | TBD | N/A | TBD | TBD | |

Replace “TBD” with actual test evidence.

## 10. Test data

Create deterministic fixtures/factories for:

- users;
- creators;
- topics;
- sources;
- ideas;
- sparks/saves;
- follows;
- reports.

Recommendation tests need intentionally designed data, not random data that produces unstable ordering.

## 11. CI later

Once tests exist, CI should run at least:

- backend tests;
- frontend tests;
- lint;
- build.

Do not add CI workflows before there is something meaningful to run.

## 12. Definition of Done

A feature is done when:

- behavior is implemented;
- error/empty/loading state is considered;
- permissions are correct;
- Persian and English UI behavior is considered;
- relevant tests pass;
- documentation/API notes are updated;
- no unexplained dependency was added.
