# 12 — Learning Guide

This project is also the curriculum.

The developer already has Node.js/Express experience, so new concepts should frequently be mapped to familiar Express concepts.

## 1. Teaching rule

For every major implementation step:

1. explain the concept;
2. compare to familiar technology where useful;
3. write a minimal example;
4. implement it in InsightInk;
5. test it;
6. explain the resulting project files.

Do not paste large unexplained generated solutions.

## 2. Python learning path

Required before/while building Django:

- interpreter and script;
- variables and types;
- list/dict/set/tuple;
- conditions/loops;
- functions;
- imports/modules/packages;
- virtual environments;
- pip;
- classes and objects;
- inheritance;
- exceptions;
- context managers;
- type hints;
- comprehensions;
- iterators at a practical level.

### Express comparison

~~~text
JavaScript module       ↔ Python module
npm package             ↔ Python package
node_modules concept    ↔ virtualenv/site-packages
package.json deps       ↔ Python dependency file
class in JS             ↔ class in Python
try/catch               ↔ try/except
~~~

## 3. Django learning path

Learn in this order:

1. project vs app;
2. settings;
3. URLConf;
4. view;
5. request/response;
6. model;
7. migration;
8. ORM;
9. admin;
10. forms/validation concepts;
11. authentication;
12. permissions;
13. testing.

### Express comparison

~~~text
Express app/router      ↔ Django URLConf + views
Express middleware      ↔ Django middleware
Prisma/Sequelize model  ↔ Django model/ORM
migration tool          ↔ Django migrations
admin dashboard plugin  ↔ Django Admin (built in)
~~~

Django is more opinionated than Express. Learn its conventions instead of forcing Express architecture into it.

## 4. Database learning path

Learn:

- table/row/column;
- primary key;
- foreign key;
- one-to-one;
- one-to-many;
- many-to-many;
- unique constraint;
- index;
- transaction;
- normalization;
- JOIN;
- basic SQL.

Even though Django ORM writes many queries for us, SQL concepts must be understood.

## 5. REST/HTTP learning path

Understand:

- URL;
- method;
- headers;
- body;
- JSON;
- status code;
- authentication;
- idempotency;
- pagination.

Important methods:

~~~text
GET
POST
PUT
PATCH
DELETE
~~~

Important status families:

~~~text
2xx success
4xx client/request/auth error
5xx server error
~~~

## 6. DRF learning path

Learn:

- Serializer;
- ModelSerializer;
- validation;
- APIView;
- generic views;
- ViewSet;
- Router;
- Permission;
- Pagination.

Do not begin with a giant ViewSet abstraction before understanding simple request handling.

## 7. HTML learning path

Learn semantic elements first:

- headings;
- paragraph;
- list;
- link;
- button;
- form;
- label;
- input;
- nav;
- main;
- article;
- section.

Semantic HTML is important for accessibility and old-device robustness.

## 8. CSS learning path

Learn:

- selectors;
- cascade;
- specificity;
- box model;
- display;
- Flexbox;
- Grid;
- responsive design;
- media queries;
- CSS variables;
- logical properties;
- RTL/LTR.

The investor prototype provides visual direction, but production CSS should be maintainable.

## 9. JavaScript browser learning path

Even with Node.js experience, browser JavaScript introduces:

- DOM;
- events;
- browser APIs;
- fetch;
- storage;
- history/navigation;
- accessibility interactions.

Learn async/await in the context of HTTP requests.

## 10. TypeScript learning path

Start by comparing equivalent JavaScript and TypeScript.

Learn:

- primitive types;
- arrays/objects;
- interfaces/type aliases;
- unions;
- optional values;
- function parameter/return types;
- generics at practical level;
- narrowing.

Do not overuse advanced type tricks.

## 11. React learning path

Order:

1. component;
2. JSX;
3. props;
4. state;
5. events;
6. conditional rendering;
7. lists/keys;
8. forms;
9. useEffect;
10. reusable hooks;
11. context;
12. routing;
13. server-state fetching.

Each concept should map to a real InsightInk feature.

Examples:

~~~text
Component       → IdeaCard
Props           → Idea data passed into IdeaCard
State           → Save button local interaction
List rendering  → Feed
Form            → Login / comment
Routing         → /ideas/:id
Context         → UI language/auth context where suitable
~~~

## 12. TanStack Query learning path

Only after fetch/API basics.

Learn:

- query key;
- query function;
- loading/error state;
- caching;
- invalidation;
- mutation;
- optimistic update;
- infinite query/pagination.

Use it for server state, not every piece of UI state.

## 13. Git learning path

Learn during real work:

- status;
- add;
- commit;
- log;
- diff;
- branch;
- merge;
- restore/revert concepts;
- remote/push/pull.

Commit by meaningful milestone, not after thousands of unrelated changes.

Example:

~~~text
feat(content): add Idea and Source models
test(auth): cover moderator permission boundaries
docs(architecture): document realtime sync design
~~~

## 14. Realtime learning path

Only in Phase 14.

Learn:

- HTTP vs WebSocket;
- connection lifecycle;
- ASGI;
- Channels consumer;
- channel layer;
- Redis;
- reconnect;
- authoritative database state.

## 15. Recommendation-algorithm learning path

Learn:

- ranking;
- weights;
- normalization;
- similarity;
- Jaccard;
- freshness;
- popularity bias;
- cold start;
- feedback loop;
- evaluation.

The recommendation system is intentionally transparent so the developer can defend it academically.

## 16. Security learning path

Learn in context:

- password hashing;
- CSRF;
- CORS;
- XSS;
- authentication;
- authorization;
- object ownership;
- secure cookies/tokens;
- HTTPS;
- secrets management.

## 17. What “understood” means

Before moving past a concept, the developer should be able to answer:

- What problem does this solve?
- Where is it used in this project?
- What would happen if we removed it?
- What are its important inputs/outputs?
- How would I debug it?
- Can I make a small version without copying an answer?

If not, revisit the concept before stacking more abstractions on top.
