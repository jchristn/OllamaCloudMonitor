#!/bin/sh
set -eu

# Resolve paths relative to this script, regardless of the caller's directory.
cd "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"

set --
if [ -f .env ]; then
    set -- --env-file .env
fi

docker compose "$@" -f compose.yaml pull
docker compose "$@" -f compose.yaml down
docker compose "$@" -f compose.yaml up -d
docker ps -a
