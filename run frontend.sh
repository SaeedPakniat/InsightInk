#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
FRONTEND_PORT="${INSIGHTINK_FRONTEND_PORT:-5173}"
BACKEND_PORT="${INSIGHTINK_BACKEND_PORT:-8000}"

if ! command -v npm >/dev/null 2>&1; then
  echo "InsightInk frontend: npm is not installed or is not on PATH." >&2
  exit 1
fi

cd "$FRONTEND_DIR"

if [[ ! -d node_modules ]]; then
  echo "Frontend dependencies are missing; installing from package-lock.json..."
  npm ci
fi

export VITE_DEV_BACKEND_TARGET="${VITE_DEV_BACKEND_TARGET:-http://127.0.0.1:$BACKEND_PORT}"

echo "InsightInk frontend → http://127.0.0.1:$FRONTEND_PORT"
exec npm run dev -- --host 127.0.0.1 --port "$FRONTEND_PORT" --strictPort "$@"
