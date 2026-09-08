#!/usr/bin/env bash
# Load the repo-root .env into the environment (if present) then exec the rest.
# Used to hand CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID to wrangler.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [ -f "$here/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$here/.env"
  set +a
fi
exec "$@"
