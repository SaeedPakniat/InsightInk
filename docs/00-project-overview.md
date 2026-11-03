# 00 — Project Overview

## 1. Product name

**InsightInk**

The current repository directory is named `InkSight`. This is a repository naming issue only; all product documentation uses the product name InsightInk.

## 2. Problem statement

The original PDS positions InsightInk as an alternative to entertainment-first social scrolling. The application exposes users to useful ideas derived from books, articles, films, documentaries and podcasts. Users can read or listen to an idea, save it, discuss it, share it, discover related ideas and interact with creators.

The product is intentionally centered on **ideas**, not short-form entertainment.

## 3. Product objectives

The system should allow a user to:

- create an account and select interests;
- browse a paginated idea feed;
- read the full idea and inspect its original source;
- see estimated reading/listening time;
- save an idea to a personal library;
- “spark” an idea as a lightweight positive signal;
- comment and report inappropriate discussion;
- follow creators;
- see creator profiles and published ideas;
- contact creators through direct messaging;
- browse related content and algorithmic recommendations;
- receive meaningful, configurable notifications;
- listen to idea text with text-to-speech;
- access library/eBook features when implemented;
- use the application in Persian and English.

## 4. Project nature

InsightInk is a **bachelor project**. The goal is to produce a complete, understandable full-stack application and learn the technology while building it.

This has two consequences:

1. The architecture must be technically respectable but not over-engineered.
2. Every major piece must be explainable by the developer without depending on generated code.

## 5. Product actors

### Reader / User

The normal application user. A reader can consume ideas, save, spark, comment, follow, message creators, manage interests and report content.

### Creator

A user with an associated creator profile. A creator keeps normal reader capabilities and can additionally own/publish ideas, expose profile information and reply to readers.

### Moderator

A system supervisor. Moderators review reports, moderate comments/content/conversations when reported, and can take limited safety actions.

Moderators **do not** control the whole system and **cannot appoint other moderators**.

### Admin

The highest-privilege system operator. Admins can manage the whole system, including assigning/removing moderators.

## 6. Role model principle

A Creator is not a completely separate type of human from a Reader.

Conceptually:

```text
User
├── normal reader capabilities
└── optional CreatorProfile
```

Django Groups and Permissions will be preferred for permission management. Admin maps naturally to Django superuser-level access.

## 7. Language policy

- Primary product language: **Persian**
- Secondary product language: **English**
- Both are developed from the beginning.
- Persian uses RTL.
- English uses LTR.
- UI translation and content language are separate concepts.

## 8. AI terminology clarification

The original material uses phrases such as “AI-assisted tool”, “idea suggesting” and “idea exploring algorithm”.

For this project, these are implemented as a **non-generative algorithmic recommendation system**.

The application will not include:

- LLM APIs;
- RAG;
- embeddings;
- vector databases;
- agents;
- prompt engineering;
- generative summaries.

Any source user story that appears to require generative summarization is treated as out-of-scope or replaced by a non-generative equivalent only when explicitly documented.

## 9. Frontend delivery principle

The product is web/PWA-first because the expected user population may include older Android and iOS devices.

Core functions should remain usable on the broadest practical browser range. Optional capabilities may degrade on older platforms instead of blocking the entire app.

## 10. Success criteria for the bachelor project

A successful project is one where:

- the core flow works end-to-end;
- source requirements are traceable to implemented features;
- architecture decisions are documented;
- tests cover critical behavior;
- recommendation logic can be explained mathematically and in code;
- Persian/English UI works correctly;
- roles and moderation work correctly;
- the system can be set up and continued from this documentation without AI.
