# 15 — Repository and Local Setup

## 1. Current repository

Current path:

~~~text
/home/Pandatron/PycharmProjects/InkSight
~~~

Current product name:

~~~text
InsightInk
~~~

Current verified environment:

~~~text
Python 3.14.8
Django 5.2.18
~~~

The repository currently contains a PyCharm project, Git metadata, a root virtual environment and an initial main.py.

## 2. Planned top-level structure

After Phase 0:

~~~text
InkSight/
├── backend/
├── frontend/
├── docs/
├── .gitignore
├── README.md
└── optional project-level helper files
~~~

The root is a monorepo container. It is not “the Django project” and not “the Vite project”.

## 3. Python environment

PyCharm currently created:

~~~text
.venv/
~~~

at repository root.

That is acceptable for a single-developer monorepo.

Rule:

- do not commit .venv;
- PyCharm interpreter should point to this environment;
- backend dependencies live in a reproducible dependency file later.

Check:

~~~bash
.venv/bin/python --version
.venv/bin/python -m django --version
~~~

## 4. Backend scaffold — future Phase 1 command

Create backend directory and initialize Django inside it rather than at repository root.

Conceptually:

~~~bash
mkdir backend
cd backend
../.venv/bin/django-admin startproject config .
~~~

Meaning of the final dot:

> create the Django project files in the current backend directory rather than creating another nested outer directory.

Do not run this until Phase 1 begins and the command is explained.

## 5. Frontend scaffold — future Phase 5 command

The frontend is independently initialized inside frontend/.

Conceptually:

~~~bash
mkdir frontend
cd frontend
npm create vite@latest . -- --template react-ts
~~~

Exact command/version should be checked at implementation time.

Do not initialize Vite at repository root.

## 6. Git status observed while writing docs

The repository already has an initial commit and remote-tracking branch.

At documentation time:

~~~text
branch shown: master
remote tracking: origin/master
~~~

A future cleanup decision may rename the branch to main. Do not change it accidentally during unrelated work.

## 7. Current tracked IDE files

The initial commit includes PyCharm .idea files.

Recommended cleanup in Phase 0:

- add .idea/ to .gitignore if personal IDE settings should not be shared;
- untrack already committed .idea files;
- decide whether any shared inspection configuration is intentionally retained.

This cleanup should be a deliberate Git operation, not a silent deletion.

## 8. Recommended .gitignore categories

When Phase 0 starts, include at least:

~~~text
# Python
.venv/
__pycache__/
*.py[cod]

# Secrets
.env
.env.*
!.env.example

# Django/runtime
*.sqlite3
media/
staticfiles/

# Frontend
node_modules/
dist/
coverage/

# IDE/editor
.idea/

# OS
.DS_Store
Thumbs.db
~~~

Adjust only when real files exist.

## 9. main.py

The current root main.py is a PyCharm starter artifact, not part of the planned application architecture.

During Phase 0 decide whether to delete it.

Do not build project logic in root main.py.

## 10. Environment variables — later

Likely backend settings:

~~~text
DJANGO_SECRET_KEY
DJANGO_DEBUG
DATABASE_URL or individual PostgreSQL settings
ALLOWED_HOSTS
CORS/CSRF origin settings if needed
~~~

Later services may add variables only when implemented.

Never pre-create dozens of unused configuration variables.

## 11. Daily development workflow

A normal future session should look like:

~~~text
1. git status
2. read the current phase/task in docs
3. learn the concept
4. make one focused change
5. run relevant tests
6. inspect git diff
7. update docs if architecture/API changed
8. commit meaningful unit of work
~~~

## 12. Commit strategy

Prefer small, understandable commits.

Examples:

~~~text
docs: add initial architecture specification
feat(content): add Idea and Source models
test(auth): cover moderator permissions
feat(feed): add cursor pagination
fix(i18n): correct RTL spacing in IdeaCard
~~~

Avoid commits such as:

~~~text
stuff
update
final2
fix everything
~~~

## 13. Dependency discipline

When a package is added:

- record why;
- understand what it provides;
- pin/reproduce versions;
- remove it if it becomes unused.

A package manager is not a substitute for architecture.

## 14. Before first Django code

Phase 0 should first resolve:

- repository naming decision if desired;
- Git branch naming;
- .gitignore;
- .idea tracking;
- root main.py;
- PostgreSQL availability/setup;
- backend dependency file format.

Then Phase 1 begins.
