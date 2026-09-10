#!/bin/bash
set -u

cd "$(dirname "$0")" || exit 1
BASE_DIR="$PWD"
PID_FILE="$BASE_DIR/.buysor-local.pid"
LOG_FILE="$BASE_DIR/.buysor-local.log"
URL="http://127.0.0.1:5173/"
PORT=5173

pause_on_error() {
  echo
  read -r -p "Press Return to close..." _
}

fail() {
  echo "[ERROR] $1"
  pause_on_error
  exit 1
}

echo "[BUYSOR] macOS local preview launcher"

if ! command -v node >/dev/null 2>&1; then
  echo "[ERROR] Node.js 22.13+ is required."
  echo "Opening nodejs.org..."
  open "https://nodejs.org/" >/dev/null 2>&1 || true
  pause_on_error
  exit 1
fi

NODE_VERSION="$(node -p 'process.versions.node' 2>/dev/null)" || fail "Could not read Node.js version."
echo "[BUYSOR] Node $NODE_VERSION"
node -e 'const [M,m]=process.versions.node.split(".").map(Number); process.exit(M>22 || (M===22 && m>=13) ? 0 : 1)' \
  || fail "Node.js 22.13+ is required. Installed: $NODE_VERSION"

if [ ! -f "$BASE_DIR/node_modules/vite/bin/vite.js" ]; then
  echo "[BUYSOR] Installing dependencies. First run can take several minutes..."
  npm ci --no-audit --no-fund || fail "npm ci failed. Check your internet connection and try again."
fi

# Stop only a BUYSOR/Vite server that this launcher previously started.
if [ -f "$PID_FILE" ]; then
  OLD_PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" 2>/dev/null; then
    echo "[BUYSOR] Stopping previous BUYSOR preview (PID $OLD_PID)..."
    kill "$OLD_PID" 2>/dev/null || true
    for _ in 1 2 3 4 5; do
      kill -0 "$OLD_PID" 2>/dev/null || break
      sleep 0.4
    done
    kill -9 "$OLD_PID" 2>/dev/null || true
  fi
  rm -f "$PID_FILE"
fi

# Refuse to kill unrelated apps using port 5173.
PORT_PID="$(lsof -nP -iTCP:$PORT -sTCP:LISTEN -t 2>/dev/null | head -n 1 || true)"
if [ -n "$PORT_PID" ]; then
  PORT_CMD="$(ps -p "$PORT_PID" -o command= 2>/dev/null || true)"
  case "$PORT_CMD" in
    *vite*|*vinext*|*BUYSOR*)
      echo "[BUYSOR] Stopping an older local preview on port $PORT..."
      kill "$PORT_PID" 2>/dev/null || true
      sleep 1
      ;;
    *)
      fail "Port $PORT is already used by another app (PID $PORT_PID). Close that app and run this file again."
      ;;
  esac
fi

mkdir -p "$BASE_DIR/.wrangler"
: > "$LOG_FILE"

echo "[BUYSOR] Starting server..."
nohup env \
  BUYSOR_LOCAL_PREVIEW=1 \
  WRANGLER_LOG_PATH="$BASE_DIR/.wrangler/wrangler.log" \
  node "$BASE_DIR/node_modules/vite/bin/vite.js" --host 127.0.0.1 --port "$PORT" \
  > "$LOG_FILE" 2>&1 &
SERVER_PID=$!
echo "$SERVER_PID" > "$PID_FILE"

echo "[BUYSOR] Waiting for the site to become ready..."
READY=0
for _ in $(seq 1 120); do
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    echo "[ERROR] BUYSOR server stopped unexpectedly."
    echo "----- server log -----"
    tail -n 80 "$LOG_FILE" 2>/dev/null || true
    pause_on_error
    exit 1
  fi

  ALL_OK=1
  for ROUTE in / /lens /category /login; do
    if ! curl -fsS --max-time 3 "http://127.0.0.1:$PORT$ROUTE" >/dev/null 2>&1; then
      ALL_OK=0
      break
    fi
  done

  if [ "$ALL_OK" -eq 1 ]; then
    READY=1
    break
  fi
  sleep 1
done

if [ "$READY" -ne 1 ]; then
  echo "[ERROR] The server did not become ready within 120 seconds."
  echo "----- server log -----"
  tail -n 80 "$LOG_FILE" 2>/dev/null || true
  pause_on_error
  exit 1
fi

echo "[BUYSOR] Ready: $URL"
open "$URL"
echo "[BUYSOR] Browser opened."
echo "[BUYSOR] To stop the server, double-click 00_STOP_BUYSOR_MAC.command"
sleep 2
exit 0
