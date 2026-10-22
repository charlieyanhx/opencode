#!/bin/sh
set -eu

OPENCODE_PASSWORD=${OPENCODE_PASSWORD-}
PP_ROUTER_API_KEY=${PP_ROUTER_API_KEY-}

if [ "${#OPENCODE_PASSWORD}" -lt 32 ]; then
  printf '%s\n' 'OPENCODE_PASSWORD must contain at least 32 characters.' >&2
  exit 1
fi

if [ "${#PP_ROUTER_API_KEY}" -lt 32 ] || [ "$PP_ROUTER_API_KEY" = "$OPENCODE_PASSWORD" ]; then
  printf '%s\n' 'PP_ROUTER_API_KEY must contain at least 32 characters and differ from OPENCODE_PASSWORD.' >&2
  exit 1
fi

bun -e '
  const url = URL.parse(process.env.PP_ROUTER_BASE_URL ?? "");
  if (!url || url.protocol !== "https:" || url.username || url.password || url.search || url.hash || !url.pathname.endsWith("/v1")) {
    console.error("PP_ROUTER_BASE_URL must be an HTTPS URL ending in /v1 without embedded credentials, query, or fragment.");
    process.exit(1);
  }
'

# Resolve the CLI's normal preload explicitly so the server can start in /workspace.
exec bun --preload /app/packages/cli/node_modules/@opentui/solid/scripts/preload.js \
  /app/packages/cli/src/index.ts serve --hostname 0.0.0.0 --port 4096
