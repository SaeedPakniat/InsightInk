#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$ROOT_DIR/.env"
PYTHON="$ROOT_DIR/.venv/bin/python"
BACKEND_PORT="${INSIGHTINK_BACKEND_PORT:-8000}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "InsightInk backend: missing $ENV_FILE" >&2
  echo "Create it from .env.example and fill in the local database settings." >&2
  exit 1
fi

if [[ ! -x "$PYTHON" ]]; then
  echo "InsightInk backend: Python virtual environment not found at $PYTHON" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

cd "$ROOT_DIR/backend"

echo "InsightInk backend → http://127.0.0.1:$BACKEND_PORT"
exec "$PYTHON" manage.py runserver "127.0.0.1:$BACKEND_PORT" "$@"
