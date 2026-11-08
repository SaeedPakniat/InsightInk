# 04 — Data Model

This is the planned conceptual model. Field names may change during implementation, but relationships and responsibilities should remain recognizable.

## 1. Custom User from day one

Use a custom Django user model at project creation time.

Reason: changing `AUTH_USER_MODEL` after migrations and relational data exist is painful.

Conceptual fields:

```text
User
- id
- email
- password hash
- display_name
- avatar (optional universal account image)
- preferred_ui_language (fa/en)
- is_active
- is_staff
- created_at
- updated_at
```

Do not add every possible profile field directly to User. The universal account
avatar is intentionally stored here because it applies to every account. It is
separate from `CreatorProfile.avatar`, which remains creator-profile presentation
data and is not used by the account API.

## 2. Creator profile

```text
CreatorProfile
- id
- user_id -> User (1:1)
- bio_fa
- bio_en
- avatar
- is_verified
- created_at
```

A creator remains a user/reader.

## 3. Topics and interests

```text
Topic
- id
- slug
- name_fa
- name_en
- is_active

UserInterest
- user_id
- topic_id
- explicit_weight (optional)
- created_at
```

Unique constraint:

```text
(user_id, topic_id)
```

## 4. Source

Represents the original work an idea came from.

```text
Source
- id
- type: BOOK | ARTICLE | MOVIE | PODCAST
- title
- creator/author text or relation where appropriate
- external_url (optional)
- cover/image (optional)
- language
- metadata
```

The source is not the same thing as the InsightInk Creator.

## 5. Idea

```text
Idea
- id
- creator_id -> CreatorProfile
- source_id -> Source
- language: fa | en
- title
- body
- estimated_read_seconds
- status: draft | published | hidden
- published_at
- created_at
- updated_at
```

Many-to-many relationship:

```text
Idea <-> Topic
```

An idea should normally have at least one topic for recommendation and discovery.

## 6. Spark

```text
Spark
- user_id
- idea_id
- created_at
```

Constraint:

```text
unique(user_id, idea_id)
```

Spark is toggle-like and should be idempotent at the API level.

## 7. Save / library entry

The simplest design is to let a Save also be the saved-idea Library entry.

```text
SavedIdea
- user_id
- idea_id
- saved_at
- last_opened_at (optional)
```

Constraint:

```text
unique(user_id, idea_id)
```

Avoid duplicating “Save” and “LibraryEntry” unless later requirements create a real distinction.

## 8. Reading activity

To support “ideas read this month”:

```text
ReadingEvent
- id
- user_id
- idea_id
- occurred_at
```

Before implementing this table, define what counts as “read” to avoid meaningless analytics.

Possible rule:

- user opens detail and remains for a minimum duration; or
- user explicitly marks complete.

This remains an implementation decision.

## 9. Comment

```text
Comment
- id
- author_id -> User
- idea_id -> Idea
- body
- status: visible | hidden | deleted
- created_at
- updated_at
```

Nested replies are not required by the current sources. Do not add comment trees unless explicitly needed.

## 10. Follow

```text
CreatorFollow
- user_id
- creator_id
- created_at
```

Unique constraint:

```text
unique(user_id, creator_id)
```

## 11. Reports and moderation

```text
Report
- id
- reporter_id
- target_type
- target_id
- reason
- details
- status: open | reviewing | resolved | rejected
- created_at
- resolved_at

ModerationAction
- id
- moderator_id
- report_id (optional)
- action_type
- target_type
- target_id
- note
- created_at
```

A generic target may be implemented carefully, or separate report types may be used. Choose the simpler Django design during implementation.

## 12. Messaging — later phase

```text
Conversation
- id
- created_at

ConversationParticipant
- conversation_id
- user_id

Message
- id
- conversation_id
- sender_id
- body
- created_at
- read_at
```

Initial product rule:

- reader ↔ creator direct conversation;
- not a general reader-to-reader social messenger.

## 13. Block / mute — later phase

```text
UserBlock
- blocker_id
- blocked_user_id
- created_at

Mute
- user_id
- target_user_id or conversation_id
- created_at
```

Exact mute semantics are defined when messaging is implemented.

## 14. Notifications — later phase

```text
Notification
- id
- recipient_id
- type
- payload
- read_at
- created_at

NotificationPreference
- user_id
- notification_type
- enabled
```

Batched creator notifications may refer to multiple underlying events through payload/data rather than one row per push.

## 15. eBooks and membership — later phase

```text
Ebook
- id
- source_id
- title
- file metadata
- language
- access_level

Membership
- id
- user_id
- provider_reference
- status
- plan
- period_start
- period_end
```

Raw payment-card data must never be stored.

## 16. Recommendation data

No embedding table is needed.

Recommendation inputs come from normal relational data:

- UserInterest;
- Spark;
- SavedIdea;
- CreatorFollow;
- Idea topics;
- publication time;
- aggregate popularity.

If performance later requires derived scores, a small relational cache/materialized score can be designed then.

## 17. Conceptual relationship diagram

```text
User ──1:1── CreatorProfile
 │
 ├──< UserInterest >── Topic ──< IdeaTopic >── Idea ──> Source
 │                                         │
 ├──< Spark >──────────────────────────────┤
 ├──< SavedIdea >──────────────────────────┤
 ├──< Comment >────────────────────────────┤
 ├──< ReadingEvent >───────────────────────┤
 │                                         │
 └──< CreatorFollow >── CreatorProfile ────┘
```

Messaging, notifications, membership and moderation attach to the same User foundation in later phases.

## 18. Database design rules

- use foreign keys rather than duplicating IDs as plain fields;
- add unique constraints for toggle relationships;
- index fields used for filtering/sorting;
- use database timestamps consistently;
- use migrations for every schema change;
- avoid JSON fields when a stable relational structure exists;
- do not denormalize until there is evidence of a performance need.
