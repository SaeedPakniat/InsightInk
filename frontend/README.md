# InsightInk Frontend

Production frontend for InsightInk.

## Stack

- React
- TypeScript
- Vite
- React Router
- TanStack Query
- i18next / react-i18next
- Vitest + React Testing Library
- plain CSS with design tokens

## Local development

The repository root contains three executable Bash launchers. They work even when your interactive shell is Fish.

Run both servers together:

```bash
cd ~/PycharmProjects/InsightInk
./"run website.sh"
```

Or run them separately:

```bash
./"run backend.sh"
./"run frontend.sh"
```

The combined launcher starts the website at `http://127.0.0.1:5173` and Django at `http://127.0.0.1:8000`. Press Ctrl+C once in that terminal to stop both.

If `frontend/node_modules` is missing, the frontend launcher installs the locked dependencies with `npm ci`.

During development, Vite proxies `/api/*` to Django. The default backend target is `http://127.0.0.1:8000`, which keeps browser session cookies and CSRF behavior simple and same-origin from the browser's point of view.

## Quality commands

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run format:check
```

## API configuration

The default API base is `/api/v1`. For a deployment that intentionally uses another origin, copy `.env.example` to a local `.env` and set `VITE_API_BASE_URL`. Never place secrets in Vite environment variables because frontend variables are visible to the browser.
