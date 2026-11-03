# 02 — Architecture

## 1. Architectural style

InsightInk uses a **modular monolith**.

That means:

- one Django deployment;
- one PostgreSQL database;
- clearly separated Django apps/domains;
- no microservices during the bachelor project;
- optional infrastructure is added only when a feature requires it.

This keeps the system simple enough to learn while preserving clean boundaries.

## 2. Baseline architecture

```text
┌──────────────────────────────┐
│ React + TypeScript + Vite    │
│ Responsive Web App / PWA     │
│ Persian RTL + English LTR    │
└──────────────┬───────────────┘
               │ HTTPS / JSON REST
               ▼
┌──────────────────────────────┐
│ Django 5.2 LTS + DRF         │
│ Modular Monolith             │
│ Auth / Content / Engagement  │
│ Library / Creators / Search  │
│ Recommendation / Moderation  │
└──────────────┬───────────────┘
               │ Django ORM
               ▼
┌──────────────────────────────┐
│ PostgreSQL                   │
└──────────────────────────────┘
```

## 3. Later realtime extension

Only when realtime sync/messaging is reached:

```text
React/PWA
   │
   ├── REST ───────────────► Django/DRF ───► PostgreSQL
   │
   └── WebSocket ──────────► Django Channels
                                  │
                                  ▼
                                Redis
```

PostgreSQL remains authoritative. WebSocket is a delivery mechanism, not the source of truth.

## 4. Planned backend modules

```text
backend/
├── config/                 # Django project configuration
└── apps/
    ├── accounts/           # user, preferences, interests, auth-related profile data
    ├── content/            # ideas, sources, topics
    ├── creators/           # creator profiles and follows
    ├── engagement/         # sparks, saves, comments
    ├── library/            # reading state, eBooks, membership-facing library data
    ├── recommendations/    # deterministic ranking/similarity
    ├── moderation/         # reports and moderation actions
    ├── messaging/          # later phase
    └── notifications/      # later phase
```

The exact number of Django apps can be adjusted while implementing. The important rule is separation by business responsibility, not creating an app for every database table.

## 5. Planned frontend organization

```text
frontend/src/
├── app/                    # app bootstrapping and routing
├── api/                    # API client and shared request logic
├── components/             # truly reusable UI primitives
├── features/
│   ├── auth/
│   ├── onboarding/
│   ├── feed/
│   ├── idea/
│   ├── explore/
│   ├── library/
│   ├── creators/
│   ├── messaging/
│   ├── notifications/
│   ├── profile/
│   └── recommendations/
├── i18n/
├── theme/
├── hooks/
└── types/
```

Feature-based structure prevents one giant `components/` folder.

## 6. Key architecture principles

### 6.1 Database first for authoritative state

Persistent state belongs in PostgreSQL.

Examples:

- accounts;
- ideas;
- saves;
- sparks;
- comments;
- follows;
- messages;
- reports;
- memberships.

### 6.2 REST first

Core application features use HTTP REST.

WebSockets are reserved for genuine realtime delivery such as:

- cross-device sync indication;
- live messages;
- possibly notification arrival.

### 6.3 Graceful enhancement

Old devices are important.

Core functions should rely on broadly supported web capabilities. Optional features such as installation, push notification or sophisticated offline behavior must not make the entire app unusable when unavailable.

### 6.4 Avoid premature infrastructure

Do not introduce a technology because it sounds scalable.

Examples:

- no Redis before a Redis-requiring feature;
- no Channels before realtime;
- no Celery before a real background-job need;
- no Elasticsearch before PostgreSQL search proves insufficient.

### 6.5 UI responsiveness is not identical to API latency

NFR-01 requires UI interactions under 100 ms.

For actions such as Save/Spark, optimistic UI can immediately reflect the action while the network request completes. The server still needs reasonable latency, but UI response and network response are different measurements.

### 6.6 Source prototype is not production architecture

The investor prototype demonstrates screens, flow, palette and interaction concepts. Its inline HTML/CSS/JavaScript is not reused as the production architecture.

Useful design tokens and flows are migrated intentionally into React components.

## 7. Error and state model

Every client feature should intentionally handle:

```text
Idle
Loading
Success
Empty
Error
Offline / degraded (where relevant)
```

A screen is not complete if only its successful state is implemented.

## 8. API versioning

Production API paths begin with:

```text
/api/v1/
```

This allows future incompatible API changes without silently breaking older clients.

## 9. Deployment philosophy

For the bachelor-project deployment:

- keep the number of services low;
- configuration comes from environment variables;
- no secret is committed to Git;
- static frontend assets can be served separately from the API in production;
- uploaded media is separated from application source code;
- production database is PostgreSQL, not SQLite.

## 10. Future scaling without redesigning everything

If the project ever grew beyond its academic scope:

- Django instances can be replicated behind a reverse proxy;
- PostgreSQL can be tuned/replicated;
- Redis can serve Channels/cache needs;
- static/media assets can use object storage/CDN;
- expensive background work can move to a task queue.

These are future paths, not initial implementation requirements.
