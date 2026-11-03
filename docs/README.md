# InsightInk Documentation Index

This directory is the authoritative development guide for the InsightInk bachelor project.

The source material consists of the original Product Description Specification (PDS), the Miro Epic/Feature/User Story boards, the NFR board, the WSJF prioritization board, and the clickable investor prototype. Project decisions made after reviewing those sources are recorded separately from source requirements.

## Reading order

1. [00-project-overview.md](00-project-overview.md) — product idea, actors and boundaries
2. [01-scope-and-requirements.md](01-scope-and-requirements.md) — functional scope, NFRs and priority
3. [02-architecture.md](02-architecture.md) — overall system architecture and principles
4. [03-tech-stack.md](03-tech-stack.md) — chosen technologies and why
5. [04-data-model.md](04-data-model.md) — planned database entities and relationships
6. [05-api-auth-and-roles.md](05-api-auth-and-roles.md) — REST API conventions, authentication and authorization
7. [06-recommendation-system.md](06-recommendation-system.md) — non-LLM recommendation design
8. [07-realtime-notifications-and-tts.md](07-realtime-notifications-and-tts.md) — sync, messaging, notifications and text-to-speech
9. [08-i18n-accessibility-and-compatibility.md](08-i18n-accessibility-and-compatibility.md) — Persian/English, RTL/LTR, old-device support and accessibility
10. [09-security-and-privacy.md](09-security-and-privacy.md) — security, moderation and privacy boundaries
11. [10-testing-and-quality.md](10-testing-and-quality.md) — testing strategy and measurable NFR verification
12. [11-development-roadmap.md](11-development-roadmap.md) — implementation sequence
13. [12-learning-guide.md](12-learning-guide.md) — what must be learned at each phase
14. [13-decisions-and-open-questions.md](13-decisions-and-open-questions.md) — ADR-style decisions and unresolved items
15. [14-source-traceability.md](14-source-traceability.md) — source stories, NFR IDs and WSJF mapping
16. [15-repository-and-setup.md](15-repository-and-setup.md) — current repo state, planned scaffold and local workflow

## Authority rule

When documentation conflicts:

1. Explicit user decisions made after reviewing the source material take precedence.
2. Then this documentation's architecture decisions.
3. Then the source PDS / Miro boards.
4. The investor prototype is a UI/product-flow reference, not production code.

## Scope discipline

This is a bachelor project, not a startup infrastructure exercise. The project deliberately avoids premature complexity. Technologies are introduced only when a requirement actually needs them.

Examples:

- Redis is not required on day one.
- Django Channels is added when realtime sync/messaging is implemented.
- Celery is not a baseline dependency.
- There is no vector database.
- There is no LLM integration.
- There is no RAG pipeline.
- There are no agents or prompt systems.

This rule is central to keeping the project understandable, finishable and defensible.
