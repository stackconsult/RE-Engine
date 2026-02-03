#!/usr/bin/env bash
set -euo pipefail

# Installs OpenClaw cron jobs for the RE Engine.
# Enhancements:
# - Idempotent by job name: will skip jobs that already exist.
# - DRY_RUN=1 prints commands without executing.
# - Requires no secrets embedded.

if ! command -v openclaw >/dev/null 2>&1; then
  echo "ERROR: openclaw CLI not found on PATH." >&2
  exit 1
fi

DRY_RUN="${DRY_RUN:-0}"

WORKSPACE="$(openclaw directory | tail -n 1 | tr -d '\r')"
if [ -z "$WORKSPACE" ]; then
  echo "ERROR: Could not resolve OpenClaw workspace via 'openclaw directory'." >&2
  exit 1
fi

if [ -z "${RE_TELEGRAM_ALERT_TARGET:-}" ]; then
  echo "ERROR: RE_TELEGRAM_ALERT_TARGET is required (your Telegram chat id)." >&2
  exit 1
fi

TZ_NAME="${RE_TZ:-America/Edmonton}"
DATA_DIR="$WORKSPACE/realestate-engine/data"
SCRIPTS_DIR="$WORKSPACE/realestate-engine/scripts"

echo "[reengine] workspace: $WORKSPACE"
echo "[reengine] data dir:   $DATA_DIR"
echo "[reengine] tz:         $TZ_NAME"
echo "[reengine] telegram:   $RE_TELEGRAM_ALERT_TARGET"
echo "[reengine] dry_run:    $DRY_RUN"

# NOTE: We intentionally mirror REengine-readme.md.

existing_names() {
  # Best-effort: normalize output to one job name per line.
  # If OpenClaw changes output format, this will fail safe (no matches -> re-add).
  openclaw cron list 2>/dev/null | sed -n 's/^\s*name:\s*//p' || true
}

job_exists() {
  local name="$1"
  existing_names | grep -Fqx "$name"
}

run_or_echo() {
  if [ "$DRY_RUN" = "1" ]; then
    echo "+ $*"
    return 0
  fi
  "$@"
}

add_job() {
  local name="$1"; shift

  if job_exists "$name"; then
    echo "[reengine] SKIP (exists): $name"
    return 0
  fi

  echo "[reengine] ADD: $name"
  run_or_echo openclaw cron add --name "$name" "$@"
}

add_job \
  "RE Engine: daily draft creation (150)" \
  --cron "0 8 * * *" \
  --tz "$TZ_NAME" \
  --session isolated \
  --message "Execute: python3 '$SCRIPTS_DIR/draft_daily_outreach.py' --data-dir '$DATA_DIR' --limit 150. Draft-only: write approvals.csv pending; no sends." \
  --deliver \
  --channel telegram \
  --to "$RE_TELEGRAM_ALERT_TARGET"

add_job \
  "RE Engine: IMAP poll + hot reply drafts" \
  --every 900000 \
  --session isolated \
  --message "Execute: python3 '$SCRIPTS_DIR/poll_imap_replies.py' --data-dir '$DATA_DIR' --max 25. Draft-only; no sends." \
  --deliver \
  --channel telegram \
  --to "$RE_TELEGRAM_ALERT_TARGET"

add_job \
  "RE Engine: WA/TG auto hot scan" \
  --every 900000 \
  --session isolated \
  --message "Execute: RE_TELEGRAM_ALERT_TARGET='$RE_TELEGRAM_ALERT_TARGET' RE_CONTACT_CAPTURE_ALERTS='${RE_CONTACT_CAPTURE_ALERTS:-telegram}' python3 '$SCRIPTS_DIR/auto_hot_scan_sessions.py' --data-dir '$DATA_DIR' --minutes 60 --per-session-messages 30 --max-hot 25. Draft replies only for known contacts.csv; unknown hot => contact_capture approval (+ optional Telegram alert)." \
  --deliver \
  --channel telegram \
  --to "$RE_TELEGRAM_ALERT_TARGET"

add_job \
  "RE Engine: approval processor" \
  --every 300000 \
  --session isolated \
  --message "Execute: python3 '$SCRIPTS_DIR/send_approved_router.py' --data-dir '$DATA_DIR' --max 20. Sends ONLY status=approved." \
  --deliver \
  --channel telegram \
  --to "$RE_TELEGRAM_ALERT_TARGET"

add_job \
  "RE Engine: LinkedIn ingest AM (silent)" \
  --cron "30 8 * * *" \
  --tz "$TZ_NAME" \
  --session isolated \
  --message "Execute: RE_TELEGRAM_ALERT_TARGET='$RE_TELEGRAM_ALERT_TARGET' python3 '$SCRIPTS_DIR/social_ingest_run.py' --data-dir '$DATA_DIR' --platform linkedin --url 'https://www.linkedin.com/messaging/' --alerts hot-only --telegram-target '$RE_TELEGRAM_ALERT_TARGET'" \
  --deliver \
  --channel telegram \
  --to "$RE_TELEGRAM_ALERT_TARGET"

add_job \
  "RE Engine: LinkedIn ingest PM (silent)" \
  --cron "30 16 * * *" \
  --tz "$TZ_NAME" \
  --session isolated \
  --message "Execute: RE_TELEGRAM_ALERT_TARGET='$RE_TELEGRAM_ALERT_TARGET' python3 '$SCRIPTS_DIR/social_ingest_run.py' --data-dir '$DATA_DIR' --platform linkedin --url 'https://www.linkedin.com/messaging/' --alerts hot-only --telegram-target '$RE_TELEGRAM_ALERT_TARGET'" \
  --deliver \
  --channel telegram \
  --to "$RE_TELEGRAM_ALERT_TARGET"

add_job \
  "RE Engine: Facebook ingest AM (silent)" \
  --cron "0 9 * * *" \
  --tz "$TZ_NAME" \
  --session isolated \
  --message "Execute: RE_TELEGRAM_ALERT_TARGET='$RE_TELEGRAM_ALERT_TARGET' python3 '$SCRIPTS_DIR/social_ingest_run.py' --data-dir '$DATA_DIR' --platform facebook --url 'https://www.facebook.com/messages' --alerts hot-only --telegram-target '$RE_TELEGRAM_ALERT_TARGET'" \
  --deliver \
  --channel telegram \
  --to "$RE_TELEGRAM_ALERT_TARGET"

add_job \
  "RE Engine: Facebook ingest PM (silent)" \
  --cron "0 17 * * *" \
  --tz "$TZ_NAME" \
  --session isolated \
  --message "Execute: RE_TELEGRAM_ALERT_TARGET='$RE_TELEGRAM_ALERT_TARGET' python3 '$SCRIPTS_DIR/social_ingest_run.py' --data-dir '$DATA_DIR' --platform facebook --url 'https://www.facebook.com/messages' --alerts hot-only --telegram-target '$RE_TELEGRAM_ALERT_TARGET'" \
  --deliver \
  --channel telegram \
  --to "$RE_TELEGRAM_ALERT_TARGET"

add_job \
  "RE Engine: weekly stats" \
  --cron "0 9 * * 5" \
  --tz "$TZ_NAME" \
  --session isolated \
  --message "Compute weekly stats from events.csv: drafts, approvals, sent, failed, replies, hot, dnc. Deliver concise summary." \
  --deliver \
  --channel telegram \
  --to "$RE_TELEGRAM_ALERT_TARGET"

echo "[reengine] cron install complete"
