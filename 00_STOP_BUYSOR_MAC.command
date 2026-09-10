#!/bin/bash
set -u

cd "$(dirname "$0")" || exit 1
PID_FILE="$PWD/.buysor-local.pid"
PORT=5173
STOPPED=0

echo "[BUYSOR] Stopping macOS local preview..."

if [ -f "$PID_FILE" ]; then
  PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
    kill "$PID" 2>/dev/null || true
    for _ in 1 2 3 4 5; do
      kill -0 "$PID" 2>/dev/null || break
      sleep 0.4
    done
    kill -9 "$PID" 2>/dev/null || true
    STOPPED=1
  fi
  rm -f "$PID_FILE"
fi

# Fallback: stop a Vite/Vinext/BUYSOR process on 5173, but never an unrelated app.
PORT_PID="$(lsof -nP -iTCP:$PORT -sTCP:LISTEN -t 2>/dev/null | head -n 1 || true)"
if [ -n "$PORT_PID" ]; then
  PORT_CMD="$(ps -p "$PORT_PID" -o command= 2>/dev/null || true)"
  case "$PORT_CMD" in
    *vite*|*vinext*|*BUYSOR*)
      kill "$PORT_PID" 2>/dev/null || true
      STOPPED=1
      ;;
  esac
fi

if [ "$STOPPED" -eq 1 ]; then
  echo "[BUYSOR] Server stopped."
else
  echo "[BUYSOR] No BUYSOR preview server was running."
fi
sleep 2
