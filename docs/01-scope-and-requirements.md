# 01 — Scope and Requirements

## 1. Source-derived functional scope

The original PDS defines these main capabilities:

- reading or sharing an experience from a book, article, film/movie or podcast;
- save, share and comment on ideas;
- pagination of ideas;
- estimated reading time;
- text-to-speech;
- idea suggesting;
- idea exploring algorithm;
- personal library and eBooks/membership;
- direct contact with creators worldwide.

The Miro boards expand the product into nine epics:

1. AI-Powered Idea Discovery
2. Real-Time, Cross-Device Experience
3. Creator Direct-Access Network
4. Library Membership & eBooks
5. Core Idea Feed & Multi-Format Content
6. Onboarding & Account Setup
7. Engagement & Social Signals
8. Multimodal Access (Text-to-Speech)
9. Notifications & Activity Awareness

## 2. Project interpretation of those epics

### Must-have core

- account creation/login;
- interest selection;
- idea/source/creator data model;
- paginated feed;
- idea detail;
- search/explore;
- spark;
- save/library;
- comments;
- creator profile/follow;
- role and moderation foundation;
- Persian + English support;
- algorithmic recommendations.

### Second-wave features

- cross-device realtime status;
- direct messaging;
- notifications;
- TTS controls;
- membership/eBooks.

These remain in the documented product scope but are implemented after the core application is stable.

## 3. Explicitly out of scope

The following are not part of the application architecture:

- LLM integration;
- RAG;
- embeddings or vector search;
- AI agents;
- prompt-based application behavior;
- microservices;
- Kubernetes;
- event-bus infrastructure;
- custom payment-card storage.

## 4. Non-functional requirements from the board

| ID | Category | Source requirement |
|---|---|---|
| NFR-01 | Performance | All UI interactions respond in under 100 ms. |
| NFR-02 | Performance | Paginated idea feed loads the next page in under 300 ms under normal network conditions. |
| NFR-03 | Scalability | Backend supports thousands of concurrent users scrolling, saving and messaging. |
| NFR-04 | Scalability | Cloud infrastructure can scale horizontally/elastically with load and traffic spikes. |
| NFR-05 | Reliability | Saved ideas and library changes propagate to all user devices within 2 seconds. |
| NFR-06 | Reliability | Platform maintains 99.9% uptime. |
| NFR-07 | Efficiency | App maintains low background CPU/RAM usage during idle and power-saving states. |
| NFR-08 | Efficiency | Media is served through a high-speed CDN. |
| NFR-09 | Compatibility | Source says native apps support iOS 14+ and Android 9+. |
| NFR-10 | Compatibility | Web access is delivered as an installable PWA. |
| NFR-11 | Data | Core relational data is stored in an SQL relational database. |
| NFR-12 | Security & Privacy | Reading history, saved ideas and personalization data support GDPR/CCPA-style export/deletion handling. |
| NFR-13 | Security & Privacy | Direct messages are encrypted in transit and restricted to participants. |
| NFR-14 | Security & Privacy | Payment handling is PCI-DSS compliant and raw card data is not stored on InsightInk servers. |
| NFR-15 | Trust & Safety | Users can report, block or mute another user/creator in messaging/comments. |
| NFR-16 | Accessibility | UI meets WCAG 2.1 AA independently of TTS. |
| NFR-17 | AI Quality | Source says AI-assisted suggestions return within 2 seconds. |
| NFR-18 | Internationalization | Idea content, UI and creator discovery support multiple languages. |

## 5. Important project-level adjustments

### NFR-09 compatibility

The original board assumes native apps. The project decision is **web/PWA first**, specifically to support older devices more broadly.

Therefore:

- NFR-09 is not copied literally into implementation.
- Exact minimum OS/browser versions will be validated through testing.
- Core reading/feed/library features receive priority over optional PWA/native-like capabilities.
- Unsupported optional features must degrade gracefully.

### NFR-17 AI quality

The term “AI-assisted” is retained only for traceability to the source board.

Implementation meaning:

> algorithmic recommendations/suggestions should be produced quickly; there is no LLM call.

## 6. WSJF source priority

| Epic | WSJF |
|---|---:|
| Onboarding & Account Setup | 8.00 |
| Library Membership & eBooks | 5.75 |
| Real-Time, Cross-Device Experience | 4.60 |
| Core Idea Feed & Multi-Format Content | 3.83 |
| Multimodal Access (Text-to-Speech) | 3.75 |
| Creator Direct-Access Network | 3.40 |
| Notifications & Activity Awareness | 2.50 |
| AI-Powered Idea Discovery | 2.28 |
| Engagement & Social Signals | 2.20 |

WSJF informs product priority, but implementation order is dependency-driven. For example, Library cannot be meaningfully implemented before Idea/Feed models exist.

## 7. Definition of MVP for this project

The first defensible MVP is reached when a user can:

1. register/login;
2. choose interests;
3. browse a real database-backed feed;
4. open an idea and its source;
5. spark/save/comment;
6. view saved ideas in Library;
7. view/follow creators;
8. search/explore content;
9. receive algorithmically ranked recommendations;
10. use the UI correctly in Persian and English.

Realtime, messaging, TTS and paid membership are subsequent milestones rather than prerequisites for the first working product.
