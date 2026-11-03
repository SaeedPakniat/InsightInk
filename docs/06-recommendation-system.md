# 06 — Recommendation System

## 1. Scope

InsightInk recommendations are **algorithmic**, not generative AI.

There is no:

- LLM;
- RAG;
- embedding model;
- vector database;
- prompt;
- agent;
- chat completion.

The word “AI” appears in the original product material, but the project implementation is a transparent recommendation/ranking system.

## 2. Goals

The recommendation system should:

- prioritize ideas matching explicit user interests;
- adapt gradually to sparks and saves;
- consider followed creators;
- expose cross-format ideas;
- avoid showing already-consumed content too aggressively;
- provide a simple reason why an idea was suggested;
- behave predictably enough to test and explain.

## 3. Cold-start strategy

A new user has no behavioral history. Onboarding interests are the first recommendation signal.

Example:

~~~text
User interests:
- Science
- Business
- History
~~~

Ideas tagged with those topics receive a positive initial score.

## 4. Behavioral signals

Signals available from normal relational data:

- explicit interests;
- saved idea topics;
- sparked idea topics;
- followed creators;
- recent reading/opening behavior if collected;
- popularity;
- freshness;
- language preference.

No hidden model is required.

## 5. Initial weighted scoring model

Conceptual formula:

~~~text
score =
    interest_match
  + save_affinity
  + spark_affinity
  + followed_creator
  + popularity
  + freshness
  + language_fit
  - already_seen_penalty
~~~

Initial hypothesis:

| Signal | Example weight |
|---|---:|
| Explicit interest topic match | +5 |
| Topic repeatedly saved | +4 |
| Topic repeatedly sparked | +3 |
| Followed creator | +3 |
| Popularity contribution | +0 to +1 |
| Freshness contribution | +0 to +1 |
| Preferred content language | +2 |
| Already consumed | negative penalty |

These values are project hypotheses, not source requirements. They are tuned with sample data and tests.

## 6. Normalizing behavioral affinity

Do not allow one very active topic to create unbounded score growth.

Possible approach:

~~~text
topic_save_affinity = min(save_count_for_topic, CAP)
topic_spark_affinity = min(spark_count_for_topic, CAP)
~~~

The exact formula is decided when sample data exists.

## 7. Similar ideas without embeddings

Each idea has topics.

For two sets of topics A and B, use Jaccard similarity:

~~~text
J(A, B) = |A ∩ B| / |A ∪ B|
~~~

Example:

~~~text
A = {Productivity, Focus, Psychology}
B = {Productivity, Focus, Habits}

intersection = 2
union = 4
similarity = 2/4 = 0.5
~~~

This is deterministic and easy to explain in a bachelor-project defense.

## 8. Optional later textual similarity

If topic similarity is too weak, a later academic enhancement may use:

- TF-IDF;
- cosine similarity;
- scikit-learn.

This is still not an LLM and does not require a vector database. It is optional, not baseline scope.

## 9. Cross-format recommendation

Format should normally not be a hard similarity filter.

Example:

~~~text
Current idea:
Topic = Focus
Format = Book

Related candidate:
Topic = Focus
Format = Podcast
~~~

The candidate can receive a diversification bonus so a book can lead to a related podcast/article/film.

## 10. Recommendation explanations

Generate one-line reasons from deterministic signals:

- “Because you selected Science.”
- “Because you saved several ideas about Focus.”
- “Because you follow this creator.”
- “Related to Productivity, but from a podcast.”
- “Popular among readers interested in History.”

No generated-language model is required.

## 11. Feed ranking versus related ideas

### Home feed ranking

Uses user-specific signals:

- interests;
- behavior;
- follows;
- language;
- freshness.

### Related ideas

Primarily uses idea-to-idea signals:

- shared topics;
- format diversification;
- popularity/freshness as tie-breakers.

Keep these as separate concepts.

## 12. Suggested service boundary

~~~text
apps/recommendations/
├── scoring.py
├── selectors.py
├── explanations.py
├── services.py
└── tests/
~~~

- scoring.py: pure score calculations.
- selectors.py: database candidate selection.
- explanations.py: deterministic reasons.
- services.py: orchestration.

Pure scoring functions are easier to test.

## 13. Performance strategy

Do not load the full Idea table into Python for every request.

Start with database filtering:

- published content only;
- allowed languages;
- exclude blocked/hidden content;
- candidate topics;
- a reasonable recent/relevant window.

Then score a manageable candidate set.

## 14. Evaluation examples

Test cold-start, behavior changes, diversity, and execution time.

Example:

~~~text
Given:
- user selected Science
- Idea A has Science
- Idea B has Cooking
- all other signals equal

Expect:
score(A) > score(B)
~~~

## 15. “Summarize in 30s” source-story conflict

One source user story mentions a quick suggestion such as “Summarize in 30s”.

Under the clarified project scope, generative summarization is **not implemented**.

Possible non-generative alternatives, only if later desired:

- manually authored short excerpt;
- estimated reading time;
- filter to shorter ideas;
- “Find similar ideas”;
- “Same topic, different format”.

This conflict is documented explicitly rather than silently adding an LLM.
