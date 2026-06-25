#!/usr/bin/env bash
# Start a local server, using the first available port from 8080 upward.
PORT=8080
while lsof -i ":$PORT" >/dev/null 2>&1; do
  PORT=$((PORT + 1))
done
echo "Serving Kaiju Clash at http://localhost:$PORT"
exec python3 -m http.server "$PORT"
