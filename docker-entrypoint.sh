#!/bin/sh
set -eu

mkdir -p "$WIKI_DATA_DIR"
chown -R app:app "$WIKI_DATA_DIR"

if [ "${WIKI_SEED_ON_START:-false}" = "true" ]; then
  echo "Checking demo notes…"
  su-exec app node dist/seed.js || echo "Cannot seed data — continue."
fi

exec su-exec app "$@"
