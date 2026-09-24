#!/usr/bin/env bash
#
# Wait for GitHub check suites to reach a terminal status, then report the result.
#
# Built for agents, skills, and commands that must block until CI finishes.
# Notably, the Cloudflare "Workers Builds" suite can take a while to register on
# a pull request, during which `gh pr checks` reports "no checks" or errors out.
# This script polls the checks API until the expected suite appears and
# completes.
#
# Usage:
#   scripts/wait-for-checks.sh [<pr-number> | <commit-sha>] [options]
#
# With no target, uses the current branch's pull request, falling back to HEAD.
#
# Options:
#   --app <slug>       Check-suite app slug to wait for
#                      (default: cloudflare-workers-and-pages)
#   --timeout <secs>   Maximum time to wait (default: 1800)
#   --interval <secs>  Seconds between polls (default: 30)
#   --all              Wait for every check suite, ignoring --app
#   -h, --help         Show this help
#
# Exit status:
#   0  every matched check suite completed successfully
#   1  at least one matched check suite failed
#   2  timed out before the suite reached a terminal status
#   3  usage or environment error

set -euo pipefail

APP_SLUG="cloudflare-workers-and-pages"
TIMEOUT=1800
INTERVAL=30
WAIT_ALL=0
TARGET=""

usage() {
  cat <<'EOF'
Usage:
  scripts/wait-for-checks.sh [<pr-number> | <commit-sha>] [options]

With no target, uses the current branch's pull request, falling back to HEAD.

Options:
  --app <slug>       Check-suite app slug to wait for
                     (default: cloudflare-workers-and-pages)
  --timeout <secs>   Maximum time to wait (default: 1800)
  --interval <secs>  Seconds between polls (default: 30)
  --all              Wait for every check suite, ignoring --app
  -h, --help         Show this help

Exit status:
  0  every matched check suite completed successfully
  1  at least one matched check suite failed
  2  timed out before the suite reached a terminal status
  3  usage or environment error
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --app) APP_SLUG="$2"; shift 2 ;;
    --timeout) TIMEOUT="$2"; shift 2 ;;
    --interval) INTERVAL="$2"; shift 2 ;;
    --all) WAIT_ALL=1; shift ;;
    -h | --help) usage; exit 0 ;;
    -*)
      echo "error: unknown option: $1" >&2
      usage >&2
      exit 3
      ;;
    *)
      if [[ -n "$TARGET" ]]; then
        echo "error: unexpected extra argument: $1" >&2
        exit 3
      fi
      TARGET="$1"
      shift
      ;;
  esac
done

command -v gh >/dev/null 2>&1 || { echo "error: gh CLI not found" >&2; exit 3; }
command -v jq >/dev/null 2>&1 || { echo "error: jq not found" >&2; exit 3; }

REPO="$(gh repo view --json nameWithOwner --jq .nameWithOwner)"

if [[ -z "$TARGET" ]]; then
  TARGET="$(gh pr view --json headRefOid --jq .headRefOid 2>/dev/null || git rev-parse HEAD)"
fi

if [[ "$TARGET" =~ ^[0-9]+$ ]]; then
  SHA="$(gh pr view "$TARGET" --json headRefOid --jq .headRefOid)"
  LABEL="PR #$TARGET"
else
  SHA="$TARGET"
  LABEL="commit ${SHA:0:7}"
fi

if [[ "$WAIT_ALL" -eq 1 ]]; then
  echo "Waiting for all check suites on $LABEL ($SHA)"
else
  echo "Waiting for '$APP_SLUG' check suites on $LABEL ($SHA)"
fi

deadline=$(( $(date +%s) + TIMEOUT ))
saw_suite=0

while :; do
  if ! raw="$(gh api "repos/$REPO/commits/$SHA/check-suites" 2>/dev/null)"; then
    echo "error: could not fetch check suites for $SHA" >&2
    exit 3
  fi
  suites="$(jq -c --arg slug "$APP_SLUG" --argjson wantAll "$([[ "$WAIT_ALL" -eq 1 ]] && echo true || echo false)" '
    [.check_suites[] |
      select($wantAll or (.app.slug == $slug)) |
      {app: .app.slug, status, conclusion}]
  ' <<<"$raw")"

  count="$(jq 'length' <<<"$suites")"
  if [[ "$count" -gt 0 ]]; then
    saw_suite=1
    jq -r '.[] | "  \(.app): \(.status):\(.conclusion // "pending")"' <<<"$suites"
  fi

  if [[ "$count" -gt 0 ]] && jq -e 'all(.status == "completed")' <<<"$suites" >/dev/null; then
    if jq -e 'all(.conclusion == "success" or .conclusion == "neutral" or .conclusion == "skipped")' <<<"$suites" >/dev/null; then
      echo "All matched check suites passed."
      exit 0
    fi
    failing="$(jq -r 'map(select(.conclusion != "success" and .conclusion != "neutral" and .conclusion != "skipped")) | map("\(.app):\(.conclusion)") | join(", ")' <<<"$suites")"
    echo "Check suite(s) failed: $failing" >&2
    exit 1
  fi

  if [[ "$(date +%s)" -ge "$deadline" ]]; then
    if [[ "$saw_suite" -eq 0 ]]; then
      echo "error: no matching check suite appeared within ${TIMEOUT}s" >&2
    else
      echo "error: check suites did not finish within ${TIMEOUT}s" >&2
    fi
    exit 2
  fi

  sleep "$INTERVAL"
done
