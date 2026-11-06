#!/usr/bin/env bash
set -Eeuo pipefail
set -m

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_SCRIPT="$ROOT_DIR/run backend.sh"
FRONTEND_SCRIPT="$ROOT_DIR/run frontend.sh"
BACKEND_PORT="${INSIGHTINK_BACKEND_PORT:-8000}"
FRONTEND_PORT="${INSIGHTINK_FRONTEND_PORT:-5173}"

backend_pid=""
frontend_pid=""

stop_group() {
  local pid="$1"

  if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
    kill -TERM -- "-$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null || true
  fi
}

cleanup() {
  local status=$?
  trap - EXIT INT TERM

  echo
  echo "Stopping InsightInk development servers..."
  stop_group "$frontend_pid"
  stop_group "$backend_pid"

  [[ -n "$frontend_pid" ]] && wait "$frontend_pid" 2>/dev/null || true
  [[ -n "$backend_pid" ]] && wait "$backend_pid" 2>/dev/null || true

  exit "$status"
}

trap cleanup EXIT INT TERM

echo "Starting InsightInk..."
"$BACKEND_SCRIPT" &
backend_pid=$!

"$FRONTEND_SCRIPT" &
frontend_pid=$!

echo
echo "Website  → http://127.0.0.1:$FRONTEND_PORT"
echo "Backend  → http://127.0.0.1:$BACKEND_PORT"
echo "Press Ctrl+C once to stop both."
echo

set +e
wait -n "$backend_pid" "$frontend_pid"
status=$?
set -e

echo "One development server stopped; shutting down the other."
exit "$status"
