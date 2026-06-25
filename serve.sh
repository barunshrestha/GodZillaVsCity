#!/usr/bin/env bash
# Start Kaiju Clash on port 8080, stopping any stale server first.
PORT="${1:-8080}"

if lsof -i ":$PORT" >/dev/null 2>&1; then
  echo "Port $PORT is in use — stopping the existing server..."
  lsof -ti ":$PORT" | xargs -r kill 2>/dev/null
  sleep 0.5
  if lsof -i ":$PORT" >/dev/null 2>&1; then
    echo "Could not free port $PORT. Try: lsof -i :$PORT"
    exit 1
  fi
fi

echo "Serving Kaiju Clash at http://localhost:$PORT"
echo "Press Ctrl+C to stop."
exec python3 -m http.server "$PORT"
