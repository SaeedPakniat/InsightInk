# 03 — Technology Stack

## 1. Confirmed local versions

At the time this document was created:

```text
Python 3.14.8
Django 5.2.18
```

Django 5.2 is used as the project line. Dependencies will later be pinned in project dependency files rather than relying on whatever happens to be globally installed.

## 2. Backend

### Python

Why:

- required for Django;
- readable syntax suitable for learning;
- good standard library;
- useful beyond this project.

Learning topics required:

- variables and data types;
- functions;
- modules/packages;
- classes and objects;
- inheritance;
- exceptions;
- context managers;
- typing;
- iterables/comprehensions;
- virtual environments and package installation.

### Django

Purpose:

- project structure;
- ORM;
- migrations;
- authentication foundation;
- permissions;
- admin;
- settings;
- request/response lifecycle.

### Django REST Framework

Purpose:

- JSON API;
- serializers;
- API views/viewsets;
- validation;
- permissions;
- pagination;
- standardized HTTP responses.

DRF is introduced only after core Django concepts are understood.

### PostgreSQL

Primary production relational database.

Why:

- directly satisfies NFR-11;
- strong relational modeling;
- indexing/search capabilities;
- mature Django support.

SQLite may be used briefly in a teaching exercise, but the actual project should move to PostgreSQL early.

## 3. Frontend

### HTML

Used to understand and create semantic document structure.

### CSS

Used for:

- layout;
- responsive design;
- RTL/LTR;
- typography;
- states;
- accessibility-sensitive presentation.

### JavaScript

Must be understood before React abstractions.

Learning topics:

- variables/functions;
- arrays/objects;
- modules;
- DOM/events;
- promises;
- `fetch`;
- `async/await`;
- error handling.

### TypeScript

Used for the production frontend.

Why:

- compile-time type checking;
- safer API integration;
- better refactoring;
- valuable resume skill.

TypeScript is taught as “JavaScript plus a type system”, not as an unrelated language.

### React

Used for UI composition.

Core concepts:

- components;
- JSX;
- props;
- state;
- events;
- hooks;
- context;
- rendering lifecycle;
- composition.

### Vite

Used as frontend development/build tooling.

Vite is not the application framework. React is the UI library; Vite provides dev server/build tooling.

### React Router

Used for client-side routes.

### TanStack Query

Introduced when frontend starts consuming real server data.

Purpose:

- server-state fetching;
- caching;
- pagination;
- retries;
- invalidation;
- optimistic updates.

Do not add Redux/Zustand unless the application later demonstrates a real need.

### react-i18next / i18next

Planned localization library for Persian and English UI text.

## 4. PWA

PWA support is an enhancement layer over the responsive web application.

Goals:

- installability where supported;
- application manifest;
- controlled caching/offline strategy where practical;
- one codebase for desktop and mobile browsers.

PWA capability must not be confused with guaranteed native-app feature parity.

## 5. Realtime stack — implemented for messaging

### Django Channels

Channels provides the ASGI/WebSocket layer for live messaging delivery. The current project pins `channels==4.3.2`.

The WebSocket endpoint is delivery-only. Persistent writes continue to use the existing authenticated REST API and PostgreSQL.

### channels-redis / Redis

The project pins `channels-redis==4.3.0` and uses `RedisChannelLayer` for cross-process delivery between active sessions.

Redis is transient delivery infrastructure, not a permanent-data store. PostgreSQL remains the source of truth for Conversations, Messages, and read state.

Tests may use Channels' in-memory channel layer so the backend suite does not require a running Redis process.

### Daphne

The project pins `daphne==4.2.1` as the ASGI development server integration. With Daphne installed, the existing Django `runserver` path serves both HTTP and WebSocket traffic through ASGI.

## 6. Testing tools

Planned:

### Backend

- pytest
- pytest-django

### Frontend

- Vitest
- React Testing Library

### End-to-end

- Playwright

### Performance/load

A tool such as Locust may be introduced when NFR-02/NFR-03/NFR-05 are measured.

## 7. Code-quality tools

Planned, introduced gradually:

Backend:

- Ruff for linting/formatting;
- type checking when useful.

Frontend:

- ESLint;
- Prettier;
- TypeScript strict settings where practical.

## 8. Technologies deliberately not selected

- Next.js — unnecessary second server-side application layer for this architecture.
- Flutter — would introduce Dart and a separate learning path.
- Ionic/Capacitor as baseline — current native wrappers constrain old-device support; web/PWA-first is preferred.
- GraphQL — REST is simpler and sufficient.
- MongoDB — core data is strongly relational.
- vector database — no embedding architecture exists.
- LLM SDKs — no LLM exists in product scope.
- microservice framework — no need at this scale.
- Kubernetes — outside project need.

## 9. Library-selection rule

Before adding any dependency, answer:

1. Which requirement needs it?
2. Can the platform/framework already do this?
3. Does the dependency reduce or increase conceptual complexity?
4. Is it actively maintained?
5. Can the developer explain what it does after using it?

If these questions cannot be answered, do not add the dependency yet.
