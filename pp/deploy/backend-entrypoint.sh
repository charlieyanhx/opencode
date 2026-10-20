#!/bin/sh
set -eu

if [ "${#OPENCODE_PASSWORD}" -lt 32 ]; then
  printf '%s\n' 'OPENCODE_PASSWORD must contain at least 32 characters.' >&2
  exit 1
fi

# Resolve the CLI's normal preload explicitly so the server can start in /workspace.
exec bun --preload /app/packages/cli/node_modules/@opentui/solid/scripts/preload.js \
  /app/packages/cli/src/index.ts serve --hostname 0.0.0.0 --port 4096
