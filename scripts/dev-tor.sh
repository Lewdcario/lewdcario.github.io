#!/usr/bin/env sh
set -eu

tor_container_id="$(docker compose ps -q tor 2>/dev/null || true)"

if [ -n "$tor_container_id" ] && [ "$(docker inspect -f '{{.State.Running}}' "$tor_container_id" 2>/dev/null || true)" = "true" ]; then
	echo "Tor service already running."
else
	echo "Starting Tor service..."
	docker compose up -d tor
fi

NUXT_TOR_PROXY=socks5://127.0.0.1:9050 nuxt dev
