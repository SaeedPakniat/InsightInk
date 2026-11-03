# 13 — Architecture Decisions and Open Questions

This file acts as a lightweight ADR register.

## Confirmed decisions

### D-001 — Backend framework

**Decision:** Django.

Reason:

- learning objective;
- strong relational ORM;
- authentication/admin foundation;
- Python ecosystem;
- good fit for content/community application.

Status: Accepted.

### D-002 — Backend architecture

**Decision:** Modular monolith.

Rejected for now:

- microservices.

Reason: project scale and learning/maintenance cost.

Status: Accepted.

### D-003 — API style

**Decision:** REST with Django REST Framework.

Rejected:

- GraphQL as baseline.

Status: Accepted.

### D-004 — Database

**Decision:** PostgreSQL for the actual project.

Reason: source NFR-11 requires SQL relational storage and the domain is strongly relational.

Status: Accepted.

### D-005 — Frontend

**Decision:** React + TypeScript + Vite.

Reason:

- builds on existing JavaScript knowledge;
- valuable learning/resume path;
- clean separation from Django;
- supports responsive web/PWA architecture.

Status: Accepted.

### D-006 — Delivery

**Decision:** Web/PWA first.

Reason:

- old-device population;
- avoids native-wrapper minimum OS constraints;
- one frontend codebase.

Status: Accepted.

### D-007 — Product languages

**Decision:** Persian primary, English secondary; both from the beginning.

Status: Accepted.

### D-008 — Roles

**Decision:** Reader/User, Creator, Moderator, Admin.

Admin assigns moderators. Moderator is a supervisor with bounded permissions.

Status: Accepted.

### D-009 — Creator model

**Decision:** Creator is a User with an optional CreatorProfile/capabilities, not an unrelated account class.

Status: Accepted.

### D-010 — Recommendation

**Decision:** deterministic algorithmic recommendation.

Explicit exclusions:

- LLM;
- RAG;
- embeddings;
- vector DB;
- agents;
- prompts.

Status: Accepted.

### D-011 — Realtime

**Decision:** REST/database first; add Channels + Redis only when realtime phase begins.

Status: Accepted.

### D-012 — Background jobs

**Decision:** no Celery baseline dependency.

Add a task queue only if an implemented feature demonstrates a real need.

Status: Accepted.

### D-013 — State management

**Decision:** React state/context + TanStack Query initially.

Do not add Redux/Zustand without demonstrated need.

Status: Accepted.

## Open questions

### Q-001 — Repository/product naming

Current repository directory: InkSight.

Product name: InsightInk.

Decision needed later: rename repository or keep repository name.

### Q-002 — Exact minimum browser/device support

Goal is very old-device friendliness.

Need empirical tests before locking an exact guarantee.

Candidate evaluation target:

- older iOS/Safari around iOS 12+;
- older Android around Android 7+.

These are not yet guaranteed.

### Q-003 — Authentication transport strategy

Need to choose exact production approach after deployment topology is known:

- same-origin session/cookie approach;
- API token approach suitable for separated origins.

Do not prematurely build custom JWT logic.

### Q-004 — Social sign-in

Source onboarding story mentions email or social sign-in.

Need final bachelor-project decision:

- implement Google/social sign-in;
- or treat email login as MVP and document social sign-in as partial/deferred.

### Q-005 — Creator publishing interface

The source focuses on creator profiles and content, but does not fully specify a creator CMS.

Possible progression:

1. use Django Admin for content entry;
2. optionally build Creator publishing UI later.

### Q-006 — Definition of “read”

Library story requests ideas read this month.

Need a measurable product definition:

- detail opened;
- minimum dwell time;
- explicit completion;
- TTS completion threshold.

Must be decided before analytics implementation.

### Q-007 — TTS technology

Need compatibility prototype before choosing:

- browser/device TTS;
- generated audio.

### Q-008 — Membership/payment

Need decide whether the final university submission requires real payment integration or a documented/demo membership flow.

Raw card data is out of scope regardless.

### Q-009 — eBook licensing/content

For academic demo, use legally safe demo/public-domain content.

Real commercial licensing is a business/legal issue outside software implementation.

### Q-010 — Offline eBook depth

Need decide whether offline download is:

- fully implemented;
- demonstrated with one sample;
- documented as stretch requirement.

### Q-011 — Push notifications

Because old iOS/browser support varies, decide after compatibility testing whether final project includes:

- in-app only;
- Web Push where supported;
- both.

### Q-012 — Source story “Summarize in 30s”

Conflicts with explicit no-generative-AI scope.

Current status: out of scope unless implemented through manually authored short content/non-generative alternative.

## Decision update rule

When an open question is resolved:

1. move it to Confirmed decisions;
2. record the reason;
3. update affected architecture/requirement files;
4. update implementation tests/documentation if code already exists.
