#!/bin/sh
set -eu

mkdir -p "$WIKI_DATA_DIR"
chown -R app:app "$WIKI_DATA_DIR"

exec su-exec app "$@"
