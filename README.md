# InsightInk

InsightInk is a bachelor-project web application centered on a feed of useful ideas extracted from books, articles, films, documentaries, and podcasts. The product goal is to replace low-value scrolling with intentional discovery, saving, discussion, and creator interaction.

> Repository directory: `InsightInk`
> Product name used throughout the documentation: **InsightInk**

## Current project status

The repository is in the **early implementation phase**. The Django backend foundation is in place; frontend implementation is still planned.

Verified local environment:

- Python: **3.14.9**
- Django: **5.2.18**
- IDE: PyCharm
- Version control: Git
- Primary language: Persian
- Secondary language: English

## Planned architecture

- Backend: Python + Django + Django REST Framework
- Database: PostgreSQL
- Frontend: React + TypeScript + Vite
- Delivery: responsive web application with PWA capabilities
- Realtime features, when reached: Django Channels + Redis
- Recommendation: deterministic algorithmic ranking; **no LLM, RAG, embeddings, agent, or prompt system**
- Product languages: Persian and English from the beginning

## Documentation

Start with [docs/README.md](docs/README.md).

The documentation is intentionally written before implementation so the project can be continued even without AI assistance.

## Repository structure

Current and planned structure:

```text
InsightInk/
├── backend/        # Django project
├── frontend/       # React/Vite application - created during implementation phase
├── docs/           # Architecture, requirements and development guide
├── .gitignore
└── README.md
```

## Important project rule

Implementation follows this cycle:

```text
Learn → Understand → Implement → Test → Document
```

The goal is not only to finish the application; every framework, library, language feature and architectural decision used in the project must be understood well enough to explain and maintain without AI.
