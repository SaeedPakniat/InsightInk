# 11 — Development Roadmap

This roadmap is dependency-driven rather than blindly following WSJF order.

Every phase follows:

~~~text
Learn → Build → Test → Document → Commit
~~~

## Phase 0 — Repository and fundamentals

### Learn

- Git basics;
- Python environment basics;
- HTTP request/response;
- frontend vs backend;
- REST overview;
- PostgreSQL overview.

### Build

- clean repository structure;
- backend/ and frontend/ directories;
- project README/docs;
- .gitignore;
- dependency strategy.

### Exit criteria

- repository is clean;
- environment can be recreated;
- developer understands what each top-level directory is for.

## Phase 1 — Django fundamentals

### Learn

- Django project vs app;
- settings;
- URL routing;
- request/response;
- models;
- migrations;
- admin;
- ORM.

### Build

- Django project;
- basic health/home route;
- initial custom User;
- PostgreSQL connection.

### Exit criteria

- Django runs locally;
- PostgreSQL works;
- migration flow is understood.

## Phase 2 — Core content model

### Learn

- ForeignKey;
- OneToOne;
- ManyToMany;
- constraints;
- indexes.

### Build

- User;
- CreatorProfile;
- Topic;
- UserInterest;
- Source;
- Idea;
- admin screens.

### Exit criteria

- admin can create real sample content;
- relationships are visible and understood.

## Phase 3 — REST API

### Learn

- serializers;
- validation;
- API views/viewsets;
- HTTP status codes;
- JSON;
- pagination.

### Build

- topics API;
- ideas API;
- creator API;
- feed baseline.

### Exit criteria

- APIs can be tested independently of frontend.

## Phase 4 — Authentication and roles

### Learn

- authentication vs authorization;
- Django permissions/groups;
- sessions/tokens;
- object ownership.

### Build

- register/login/logout;
- me/profile;
- Reader/Creator/Moderator/Admin permissions;
- admin-only moderator assignment.

### Exit criteria

- role matrix is enforced by tests.

## Phase 5 — Frontend foundations

### Learn

- HTML semantics;
- CSS/layout/responsive;
- JavaScript DOM/events/fetch;
- TypeScript basics;
- npm/package.json;
- Vite.

### Build

- frontend scaffold;
- design tokens;
- static layout;
- RTL/LTR foundation.

### Exit criteria

- frontend builds and runs;
- developer can explain toolchain.

## Phase 6 — React fundamentals

### Learn

- JSX;
- components;
- props;
- state;
- hooks;
- events;
- routing.

### Build

- navigation;
- IdeaCard;
- shared buttons/inputs;
- route skeletons matching product prototype.

## Phase 7 — Onboarding

Build:

- account flow;
- first-run explanation;
- topic selection;
- UI language selection;
- interests API integration.

This corresponds strongly to the highest WSJF epic.

## Phase 8 — Core feed

Build:

- real feed;
- pagination;
- idea cards;
- reading/listening estimate;
- idea detail;
- source display.

## Phase 9 — Engagement

Build:

- Spark;
- Save;
- Comments;
- Report comment;
- external share where supported.

## Phase 10 — Library

Build:

- saved ideas;
- reading/opening statistics after read-definition is decided;
- library filters.

Membership/eBooks are not required to block basic library.

## Phase 11 — Creators

Build:

- creator profiles;
- creator published ideas;
- follow/unfollow;
- creator public counts.

## Phase 12 — Explore and search

Build:

- query search;
- topic browsing;
- source/format filters;
- Persian text-normalization strategy.

## Phase 13 — Algorithmic recommendation

Build:

- explicit-interest score;
- save/spark affinity;
- follow signal;
- freshness/popularity;
- language fit;
- Jaccard related ideas;
- deterministic explanation.

No LLM.

## Phase 14 — Realtime sync

Only now introduce:

- Django Channels;
- Redis;
- WebSocket lifecycle;
- sync/pending state;
- two-session/device tests.

## Phase 15 — Direct messaging

Build:

- conversations;
- participant rules;
- persisted messages;
- live delivery;
- block/report integration.

## Phase 16 — Notifications

Build:

- in-app notifications;
- preferences;
- followed-creator batching;
- push only if feasible/needed.

## Phase 17 — TTS

Run compatibility prototype first.

Then implement the simplest option that satisfies enough requirements.

## Phase 18 — Membership/eBooks

Build only after core product is stable:

- eBook metadata/shelf;
- entitlement;
- membership state;
- payment provider if required for final submission;
- offline access if feasible.

## Phase 19 — Moderation completeness

Complete:

- report queues;
- moderation actions;
- user/content restrictions;
- moderator audit trail.

## Phase 20 — Hardening

- accessibility;
- old-device testing;
- performance;
- security review;
- bilingual polish;
- error handling;
- database indexes.

## Phase 21 — Deployment

- production settings;
- environment variables;
- database;
- HTTPS;
- static/media strategy;
- monitoring appropriate to project.

## Phase 22 — Final academic documentation

Create:

- architecture diagrams;
- ERD;
- final requirement traceability;
- screenshots;
- test results;
- measured limitations;
- installation guide;
- final LaTeX/PDF report.

## Project rule for moving between phases

Do not jump to a later “interesting” technology while an earlier dependency is incomplete.

Examples:

- do not build WebSockets before Save works over REST;
- do not tune recommendation before Idea/Topic data exists;
- do not add payment before basic Library works;
- do not add PWA complexity before responsive web UI is stable.
