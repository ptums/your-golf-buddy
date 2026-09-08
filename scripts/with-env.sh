#!/usr/bin/env bash
# Load KEY=VALUE lines from the repo-root .env into the environment (if present)
# then exec the rest. Used to hand CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID
# (and anything else) to wrangler / opennext.
#
# This PARSES the file — it does not `source` it — so comments, blank lines and
# malformed lines are ignored rather than executed.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
env_file="$here/.env"

if [ -f "$env_file" ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    # strip leading whitespace
    line="${line#"${line%%[![:space:]]*}"}"
    [ -z "$line" ] && continue
    [ "${line:0:1}" = "#" ] && continue
    line="${line#export }"
    case "$line" in
      *=*) : ;;
      *) continue ;;
    esac

    key="${line%%=*}"
    val="${line#*=}"
    key="${key//[[:space:]]/}"

    # only accept a real shell-var name
    case "$key" in
      [A-Za-z_]*) : ;;
      *) continue ;;
    esac
    case "$key" in
      *[!A-Za-z0-9_]*) continue ;;
    esac

    # strip one layer of matching surrounding quotes
    if [ "${#val}" -ge 2 ]; then
      case "$val" in
        \"*\") val="${val:1:${#val}-2}" ;;
        \'*\') val="${val:1:${#val}-2}" ;;
      esac
    fi

    export "$key=$val"
  done < "$env_file"
fi

exec "$@"
