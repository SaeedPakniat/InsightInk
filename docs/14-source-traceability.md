# 14 — Source Traceability

This file preserves the supplied product material so implementation decisions can be traced back to the original project sources.

It does not claim that every source story will be implemented exactly as written. Where later project decisions change scope, the conflict is explicitly recorded.

# A. Original PDS product direction

The supplied PDS describes InsightInk as a feed of ideas based on experiences with:

- books;
- articles;
- movies/films;
- podcasts.

The PDS includes:

- save/share/comment;
- pagination;
- estimated reading time;
- AI-assisted tool terminology;
- text-to-speech;
- idea suggesting;
- idea exploring algorithm;
- library/eBooks/membership;
- direct contact with writers/directors/podcast makers;
- fast response;
- CDN;
- scalable backend;
- low background resource usage;
- realtime sync;
- iOS/Android;
- PWA web access;
- cloud infrastructure;
- relational SQL database.

# B. Epic and user-story traceability

## Epic — AI-Powered Idea Discovery

Source stories:

1. As a reader, I want to ask the AI assistant for ideas similar to the one I’m reading, so I can go deeper on a theme I care about. [NFR-17]
2. As a reader, I want to see a one-line reason an idea was suggested, so I can trust the recommendation. [NFR-17]
3. As a reader, I want quick-suggestion chips (e.g. “Summarize in 30s”) instead of typing, so I can act on the assistant faster. [NFR-01]
4. As a reader, I want my home feed to prioritize ideas close to my declared interests, so scrolling stays worth my time. [NFR-01]
5. As a reader, I want the feed to adapt as I spark and save different topics, so recommendations improve without manual retuning. [NFR-12]
6. As a reader, I want cross-format suggestions (a book idea leading to a related podcast), so I discover formats I wouldn’t search for myself. [NFR-03]
7. As a new user, I want to select topics I care about during onboarding, so my first feed session feels relevant. [NFR-01]
8. As a user, I want to update my interests later from Profile, so my feed can evolve with me. [NFR-12]

Project interpretation:

- implemented as deterministic algorithmic recommendation;
- “AI assistant” becomes idea/recommendation exploration behavior, not an LLM chat;
- one-line reason is rule-based;
- “Summarize in 30s” is out of scope unless replaced by non-generative/manual short content.

## Epic — Real-Time, Cross-Device Experience

Source stories:

1. As a reader, I want an idea I save on my phone to appear in my library on my laptop within seconds, so I can pick up where I left off. [NFR-05]
2. As a reader, I want to see a synced/pending indicator, so I trust that my save actually went through. [NFR-05]
3. As a reader anywhere in the world, I want idea cards and thumbnails to load without a visible delay, so scrolling feels smooth. [NFR-08]
4. As a reader on a slow connection, I want text-to-speech audio to begin playing within a second of pressing play, so I don’t lose focus. [NFR-08]
5. As a platform operator, I want the backend to auto-scale during traffic spikes (e.g. a viral idea), so performance doesn’t degrade for existing users. [NFR-04]
6. As a reader, I want the app to remain available during peak hours, so I’m never blocked from reading, saving, or messaging. [NFR-06]

Project interpretation:

- REST/database correctness first;
- Channels + Redis introduced only for realtime phases;
- academic project documents tested load instead of pretending full commercial SLA.

## Epic — Creator Direct-Access Network

Source stories:

1. As a reader, I want to view a creator’s profile with their bio and published ideas, so I can explore more of their work. [NFR-01]
2. As a reader, I want to follow a creator, so new ideas from them reach my notifications. [NFR-01]
3. As a creator, I want my profile to show my reach (ideas, sparks, followers), so readers can gauge my body of work. [NFR-01]
4. As a reader, I want to message a creator directly about their idea, so I can ask questions or say thanks. [NFR-13]
5. As a creator, I want to reply to reader messages inside the app, so I can build a relationship with my audience without leaving InsightInk. [NFR-13]
6. As a user, I want to report or block someone in a conversation, so I feel safe contacting creators or being contacted. [NFR-15]
7. As a non-English-speaking creator, I want my profile and ideas to be discoverable to readers in my language, so I can reach my existing audience on InsightInk. [NFR-18]

Project interpretation:

- Creator is a User with CreatorProfile;
- Persian + English are first project languages;
- messaging is reader↔creator initial scope;
- moderation access is bounded.

## Epic — Library Membership & eBooks

Source stories:

1. As a reader, I want all my saved ideas in one Library tab, so I don’t lose track of what I wanted to revisit. [NFR-05]
2. As a reader, I want to see how many ideas I’ve read this month, so I can track my own progress. [NFR-11]
3. As a reader, I want to browse eBooks connected to ideas I’ve enjoyed, so I can go deeper into a full work. [NFR-11]
4. As a reader, I want to purchase a library membership securely, so I can unlock full eBooks without leaving the app. [NFR-14]
5. As a member, I want to download eBooks for offline reading, so I can read without a connection. [NFR-11]

Project interpretation:

- Saved Library is implemented before paid membership;
- definition of “read” remains open;
- payment depth is a later academic-scope decision;
- raw card data is never stored.

## Epic — Core Idea Feed & Multi-Format Content

Source stories:

1. As a reader, I want to scroll through a paginated feed of ideas, so the app stays fast even with a long content history. [NFR-02]
2. As a reader, I want to see the estimated reading or listening time on every card, so I can choose ideas that fit my available time. [NFR-01]
3. As a reader, I want to open an idea to read its full text, so I get the complete thought, not just a preview. [NFR-01]
4. As a reader, I want to see the original source (book, movie, podcast, or article) an idea came from, so I can find the full work if I want more. [NFR-08]
5. As a reader, I want to share an idea about a book, movie, podcast, or article I experienced, so I can help others start the same journey. [NFR-08]
6. As a reader, I want to share an idea outside the app, so I can spread it beyond InsightInk’s audience. [NFR-08]

Project interpretation:

- this is foundational scope;
- feed uses real database data;
- pagination strategy should be robust for changing feeds;
- source is a first-class model.

## Epic — Onboarding & Account Setup

Source stories:

1. As a new user, I want to create an account quickly (email or social sign-in), so I can start using InsightInk without friction. [NFR-09]
2. As a returning user, I want to log in on a new device and see my existing library, so switching phones doesn’t cost me my saved ideas. [NFR-05]
3. As a new user, I want a short, clear intro to what InsightInk is (a feed of ideas, not entertainment), so I understand the app’s purpose before I start scrolling. [NFR-01]

Project interpretation:

- email account is core;
- social sign-in remains an open scope decision;
- library is account/server based;
- onboarding includes interests and language.

## Epic — Engagement & Social Signals

Source stories:

1. As a reader, I want to “spark” an idea that resonated with me, so I can signal quality without writing anything. [NFR-01]
2. As a reader, I want to save an idea for later, so I can build my own collection over time. [NFR-05]
3. As a reader, I want to comment on an idea, so I can share how it applied to my life or add to the discussion. [NFR-01]
4. As a reader, I want to report an inappropriate comment, so the discussion around ideas stays constructive. [NFR-15]

Project interpretation:

- Spark and Save are unique user↔idea relationships;
- save is the basis of personal Library;
- report flows connect to Moderator role.

## Epic — Multimodal Access (Text-to-Speech)

Source stories:

1. As a reader, I want to tap play and hear an idea read aloud, so I can consume it while doing something else. [NFR-08]
2. As a reader, I want to see playback progress and scrub through the audio, so I can control listening the way I would a podcast. [NFR-16]
3. As a reader, I want to choose a text-to-speech voice I find pleasant, so long listening sessions feel natural. [NFR-16]
4. As a reader using a screen reader, I want every screen to be fully navigable by touch or without a mouse, so InsightInk is usable regardless of ability. [NFR-16]

Project interpretation:

- TTS technology is not selected until compatibility testing;
- accessibility is independent of TTS.

## Epic — Notifications & Activity Awareness

Source stories:

1. As a reader, I want to see when my saved idea has synced across devices, so I know it’s safe. [NFR-05]
2. As a reader, I want new ideas from creators I follow batched into a single notification, so I’m not interrupted repeatedly. [NFR-06]
3. As a user, I want to turn off specific notification types, so I only get alerts I actually want. [NFR-06]

Project interpretation:

- in-app notifications are the safest baseline;
- Web Push is evaluated against old-device/browser compatibility;
- preferences are persisted server-side.

# C. NFR traceability

| ID | Category | Requirement | Project treatment |
|---|---|---|---|
| NFR-01 | Performance | UI interaction <100 ms | target measured as perceived/local interaction; optimistic UI where appropriate |
| NFR-02 | Performance | next feed page <300 ms | measurable API/client target |
| NFR-03 | Scalability | thousands concurrent | load-test progressively; document tested evidence |
| NFR-04 | Scalability | horizontal/elastic scaling | architecture path documented; not mandatory infrastructure for local MVP |
| NFR-05 | Reliability | cross-device change <2s | later Channels/Redis phase + measurement |
| NFR-06 | Reliability | 99.9% uptime | design target; do not claim annual SLA without evidence |
| NFR-07 | Efficiency | low idle CPU/RAM | test representative browsers/devices |
| NFR-08 | Efficiency | CDN media | implement if deployment scope includes it; otherwise document limitation |
| NFR-09 | Compatibility | native iOS14+/Android9+ | changed to web/PWA-first old-device strategy |
| NFR-10 | Compatibility | installable PWA | retained where browser supports it |
| NFR-11 | Data | SQL relational DB | PostgreSQL |
| NFR-12 | Security/Privacy | export/deletion/privacy handling | data model and user-data lifecycle design |
| NFR-13 | Security/Privacy | DM encrypted in transit + participant-only | HTTPS/WSS + authorization |
| NFR-14 | Security/Privacy | PCI-safe payment, no raw cards | external provider only if payment implemented |
| NFR-15 | Trust/Safety | report/block/mute | retained |
| NFR-16 | Accessibility | WCAG 2.1 AA independent of TTS | retained as minimum target |
| NFR-17 | AI Quality | suggestions <2s | reinterpreted as algorithmic recommendation latency |
| NFR-18 | Internationalization | multilingual content/UI/discovery | Persian + English from day one |

# D. WSJF traceability

| Epic | User-Business Value | Time Criticality | Risk Reduction / Opportunity | CoD | Effort | WSJF |
|---|---:|---:|---:|---:|---:|---:|
| AI-Powered Idea Discovery | 6 | 5 | 5 | 16 | 7 | 2.28 |
| Real-Time, Cross-Device Experience | 8 | 7 | 8 | 23 | 5 | 4.60 |
| Creator Direct-Access Network | 6 | 3 | 8 | 17 | 5 | 3.40 |
| Library Membership & eBooks | 8 | 7 | 8 | 23 | 4 | 5.75 |
| Core Idea Feed & Multi-Format Content | 7 | 8 | 8 | 23 | 6 | 3.83 |
| Onboarding & Account Setup | 6 | 8 | 10 | 24 | 3 | 8.00 |
| Engagement & Social Signals | 4 | 3 | 4 | 11 | 5 | 2.20 |
| Multimodal Access (Text-to-Speech) | 6 | 2 | 7 | 15 | 4 | 3.75 |
| Notifications & Activity Awareness | 3 | 2 | 5 | 10 | 4 | 2.50 |

WSJF is product prioritization evidence, not a strict coding dependency order.
