#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
log_file=/tmp/hollow-house-http.log
# Re-attaching to the Codespace must not start a second server on this port.
if curl --fail --silent http://localhost:8000/index.html | grep -q 'HOLLOW HOUSE'; then
  printf 'Hollow House is already running on port 8000.\n'
  exit 0
fi
nohup python3 -m http.server 8000 >"$log_file" 2>&1 </dev/null &
server_pid=$!
for attempt in {1..30}; do
  if curl --fail --silent http://localhost:8000/index.html | grep -q 'HOLLOW HOUSE'; then
    printf 'Hollow House is ready on port 8000 (PID %s).\n' "$server_pid"
    if [[ -n "${CODESPACE_NAME:-}" ]]; then
      printf 'Play: https://%s-8000.%s\n' "$CODESPACE_NAME" "${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-app.github.dev}"
    else
      printf 'Play: http://localhost:8000\n'
    fi
    exit 0
  fi
  if ! kill -0 "$server_pid" 2>/dev/null; then cat "$log_file"; exit 1; fi
  sleep 0.2
done
printf 'Server did not become ready. See %s\n' "$log_file" >&2
exit 1
