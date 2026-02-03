# RE Engine (OpenClaw) — Mac MVP (Save Point)

This file is a **save point** for the Real Estate Outreach Engine README.

Designed for:
- **macOS only**
- **Dedicated WhatsApp number**
- **One-inbox approvals** in the OpenClaw **Web dashboard/WebChat**
- **Local-first storage** using a **folder of CSV files**
- Upgrade path: **CSV → Neon (Postgres)** (Supabase optional later)
- Multi-channel: **Email + WhatsApp + Telegram + LinkedIn + Facebook**
- Approval-first outbound across all channels

---

## 0) Safety + Secrets (Read This First)

- **Never** put passwords/API keys in any README or Git repo.
- Use environment variables for SpaceEmail credentials.
- OpenClaw can message real people. Use **pairing** + **allowlists**.
- **2FA/CAPTCHA cannot be solved automatically** safely. Our flow is: open page → you complete gate → continue.

If you previously pasted a mailbox password anywhere public, rotate it.

---

## 1) Install OpenClaw (Mac)

1) Install Node.js **v22+**

2) Install OpenClaw:
```bash
npm install -g openclaw@latest
```

3) Run the wizard (creates your workspace and installs a daemon):
```bash
openclaw onboard --install-daemon
```

4) Confirm health:
```bash
openclaw doctor
```

---

## 2) Find Your Workspace Path (Do Not Guess)

Run:
```bash
openclaw directory
```

In this document we refer to that path as:
- `<WORKSPACE>`

---

## 3) Data Storage (MVP): Folder of CSVs

Create folders:
```bash
mkdir -p "<WORKSPACE>/realestate-engine/data"
mkdir -p "<WORKSPACE>/realestate-engine/scripts"
mkdir -p "<WORKSPACE>/skills/csv-approvals"
mkdir -p "<WORKSPACE>/skills/realestate-outreach-engine"
```

### Core CSV files (create these in `<WORKSPACE>/realestate-engine/data/`)

#### `leads.csv`
```csv
lead_id,first_name,last_name,email,phone_e164,city,province,source,tags,status,created_at
```

#### `events.csv`
```csv
event_id,ts,lead_id,channel,event_type,campaign,message_id,meta_json
```

#### `approvals.csv`
```csv
approval_id,ts_created,lead_id,channel,action_type,draft_subject,draft_text,draft_to,status,approved_by,approved_at,notes
```

#### `templates.csv` (optional)
```csv
template_id,name,channel,stage,subject,body
```

#### `dnc.csv`
```csv
value,reason,ts_added
```

#### `contacts.csv` (WA/TG mapping)
```csv
lead_id,channel,external_id
```
- WhatsApp `external_id` = phone E.164 (e.g. `+17801234567`)
- Telegram `external_id` = **numeric user ID only**

### Social + identity tracking (MVP) — IDP (structured), no OCR

We do **not** use OCR.
We use **IDP-style structured extraction**:
- snapshot/DOM text via the OpenClaw browser tool where possible
- safe fallback: copy/paste of name + profile URL + message

#### `identities.csv`
```csv
identity_id,full_name,company,role,city,province,notes,created_at,updated_at
```

#### `handles.csv`
```csv
identity_id,channel,handle_type,handle_value,is_primary,created_at
```

Examples:
- WhatsApp: `channel=whatsapp, handle_type=phone_e164, handle_value=+1780...`
- Telegram: `channel=telegram, handle_type=user_id, handle_value=123456789`
- LinkedIn: `channel=linkedin, handle_type=profile_url, handle_value=https://www.linkedin.com/in/...`
- Facebook: `channel=facebook, handle_type=profile_url, handle_value=https://www.facebook.com/...`

#### `inbox_items.csv` (unified inbox tracker)
```csv
inbox_id,ts,channel,external_thread_id,external_sender_id,sender_display_name,identity_id,lead_id,direction,text_snippet,grade,status,meta_json
```

---

## 4) Channels: WhatsApp + Telegram (Dedicated WhatsApp Number)

### WhatsApp (recommended: pairing)
Add to `~/.openclaw/openclaw.json`:

```jsonc
{
  "channels": {
    "whatsapp": {
      "dmPolicy": "pairing",
      "allowFrom": ["+1YOUR_OWNER_PHONE"],
      "ackReaction": {
        "emoji": "👀",
        "direct": true,
        "group": "mentions"
      }
    }
  }
}
```

Link WhatsApp (QR scan):
```bash
openclaw channels login
```

Approve new inbound DM pairing codes:
```bash
openclaw pairing approve whatsapp <code>
```

Docs: https://docs.openclaw.ai/channels/whatsapp

### Telegram (pairing)
Add:
```jsonc
{
  "channels": {
    "telegram": {
      "enabled": true,
      "botToken": "<YOUR_BOTFATHER_TOKEN>",
      "dmPolicy": "pairing"
    }
  }
}
```

Approve pairing:
```bash
openclaw pairing approve telegram <CODE>
```

**Telegram delivery target (MVP standard):** one Telegram **DM chat id** for alerts + summaries.

Docs: https://docs.openclaw.ai/channels/telegram

---

## 5) Tools You’ll Use (Core)

From OpenClaw docs tool inventory:
- `message` (send WhatsApp/Telegram messages)
- `cron` (scheduling)
- `webhook` (optional external triggers)
- `browser` (LinkedIn/Facebook semi-auto + snapshot-based IDP)
- `sessions_*` tools (optional advanced routing/automation)

Docs: https://docs.openclaw.ai/tools

---

## 6) Skills CLI (validate)

```bash
openclaw skills list
openclaw skills list --eligible
openclaw skills check
openclaw skills info <name>
```

Docs: https://docs.openclaw.ai/cli/skills

---

## 7) SpaceEmail (SMTP/IMAP) — Env Vars

Use env vars (do not commit secrets):

```bash
export SPACEMAIL_USER="kirtis@stackconsulting.pro"
export SPACEMAIL_PASS="<YOUR_SPACEMAIL_PASSWORD>"

export SPACEMAIL_IMAP_HOST="mail.spacemail.com"
export SPACEMAIL_IMAP_PORT="993"

export SPACEMAIL_SMTP_HOST="mail.spacemail.com"
export SPACEMAIL_SMTP_PORT="465"
export SPACEMAIL_SMTP_USER="$SPACEMAIL_USER"
export SPACEMAIL_SMTP_PASS="$SPACEMAIL_PASS"
```

---

## 8) MVP Approval Model (One Inbox)

- Inbound messages are monitored.
- The system **creates drafts** in `approvals.csv` with `status=pending`.
- You approve from the **Web dashboard/WebChat**.
- A processor sends only items with `status=approved`.

Lead status lifecycle (standardized):
- `new → drafted → sent → replied → hot` (and `dnc` any time)

Social approvals lifecycle (recommended):
- `pending → approved → approved_opened → sent_manual`

---

## 9) Scripts (MVP)

All scripts live in:
`<WORKSPACE>/realestate-engine/scripts/`

### Approval queue scripts
- `csv_utils.py`
- `show_approvals.py`
- `approve.py`
- `reject.py`
- `edit.py`

### Lead store + mapping
- `lead_store.py` (status updates)
- `lead_lookup.py` (robust email mapping + plus-stripping)

### Email
- `spacemail_smtp_send.py`
- `draft_daily_outreach.py` (150/day; includes footer `Ref: <lead_id>`; updates lead status new→drafted)
- `poll_imap_replies.py` (every 15 min; uses Ref tag first; fallback Reply-To/From; updates lead status to replied/hot)

### Approval send router
- `send_approved_router.py` (sends approved items)

### WhatsApp/Telegram hot routing
- `chat_hot_router.py` (classify message text; draft pending reply; update lead status hot)
- `auto_hot_scan_sessions.py` (scans sessions; drafts replies only for known contacts)
- `contact_capture.py` (creates pending contact_capture approvals for unknown hot senders)
- `contacts_add.py` (adds mappings to contacts.csv; Telegram numeric-only)
- `notify_telegram.py` (helper for alerts)

### LinkedIn/Facebook (posts + DMs)
- `draft_social.py` (creates LI/FB post + DM drafts into approvals.csv)
- `mark_sent_manual.py` (after you click Post/Send)
- `idp_social_ingest.py` (snapshot-first structured ingest; UUID identity IDs; fallback manual fields)
- `social_ingest_run.py` (wrapper: silent unless new HOT items)

Run scripts with explicit data dir:
```bash
python3 "<WORKSPACE>/realestate-engine/scripts/show_approvals.py" --data-dir "<WORKSPACE>/realestate-engine/data"
```

---

## 10) Browser Setup (LinkedIn/Facebook)

Enable browser tool (recommended):
```jsonc
{
  "browser": {
    "enabled": true,
    "defaultProfile": "openclaw"
  }
}
```

Start the OpenClaw browser profile:
```bash
openclaw browser --browser-profile openclaw start
```

Log into LinkedIn + Facebook in that browser profile.

Docs: https://docs.openclaw.ai/tools/browser

---

## 11) Contact Capture Prompts (Unknown Hot Senders)

Policy:
- If hot WA/TG sender is **not** in `contacts.csv`, do **not** draft a reply.
- Instead create a `contact_capture` approval row in `approvals.csv`.
- Recommended: send a Telegram DM alert that capture is pending.

Toggle (used by the scan job):
- `RE_CONTACT_CAPTURE_ALERTS=telegram` (recommended)
- `RE_CONTACT_CAPTURE_ALERTS=off` (quiet)

---

## 12) Cron Jobs (Exact Commands) — America/Edmonton

> Replace `<WORKSPACE>` and `<YOUR_TELEGRAM_CHAT_ID>`.

### Set your Telegram DM target for alerts
```bash
export RE_TELEGRAM_ALERT_TARGET="<YOUR_TELEGRAM_CHAT_ID>"
export RE_CONTACT_CAPTURE_ALERTS="telegram"   # or off
```

### Job 1 — Daily drafts (150/day) at 8:00 AM
```bash
openclaw cron add \
  --name "RE Engine: daily draft creation (150)" \
  --cron "0 8 * * *" \
  --tz "America/Edmonton" \
  --session isolated \
  --message "Execute: python3 '<WORKSPACE>/realestate-engine/scripts/draft_daily_outreach.py' --data-dir '<WORKSPACE>/realestate-engine/data' --limit 150. Draft-only: write approvals.csv pending; no sends." \
  --deliver \
  --channel telegram \
  --to "<YOUR_TELEGRAM_CHAT_ID>"
```

### Job 2 — IMAP poll (15 min)
```bash
openclaw cron add \
  --name "RE Engine: IMAP poll + hot reply drafts" \
  --every 900000 \
  --session isolated \
  --message "Execute: python3 '<WORKSPACE>/realestate-engine/scripts/poll_imap_replies.py' --data-dir '<WORKSPACE>/realestate-engine/data' --max 25. Draft-only; no sends." \
  --deliver \
  --channel telegram \
  --to "<YOUR_TELEGRAM_CHAT_ID>"
```

### Job 3 — WA/TG auto hot scan (15 min)
```bash
openclaw cron add \
  --name "RE Engine: WA/TG auto hot scan" \
  --every 900000 \
  --session isolated \
  --message "Execute: RE_TELEGRAM_ALERT_TARGET='<YOUR_TELEGRAM_CHAT_ID>' RE_CONTACT_CAPTURE_ALERTS='telegram' python3 '<WORKSPACE>/realestate-engine/scripts/auto_hot_scan_sessions.py' --data-dir '<WORKSPACE>/realestate-engine/data' --minutes 60 --per-session-messages 30 --max-hot 25. Draft replies only for known contacts.csv; unknown hot => contact_capture approval (+ optional Telegram alert)." \
  --deliver \
  --channel telegram \
  --to "<YOUR_TELEGRAM_CHAT_ID>"
```

### Job 4 — Approval processor (every 5 min)
```bash
openclaw cron add \
  --name "RE Engine: approval processor" \
  --every 300000 \
  --session isolated \
  --message "Execute: python3 '<WORKSPACE>/realestate-engine/scripts/send_approved_router.py' --data-dir '<WORKSPACE>/realestate-engine/data' --max 20. Sends ONLY status=approved." \
  --deliver \
  --channel telegram \
  --to "<YOUR_TELEGRAM_CHAT_ID>"
```

### Job 5 — LinkedIn ingest (2x/day) — silent unless HOT
```bash
openclaw cron add \
  --name "RE Engine: LinkedIn ingest AM (silent)" \
  --cron "30 8 * * *" \
  --tz "America/Edmonton" \
  --session isolated \
  --message "Execute: RE_TELEGRAM_ALERT_TARGET='<YOUR_TELEGRAM_CHAT_ID>' python3 '<WORKSPACE>/realestate-engine/scripts/social_ingest_run.py' --data-dir '<WORKSPACE>/realestate-engine/data' --platform linkedin --url 'https://www.linkedin.com/messaging/' --alerts hot-only --telegram-target '<YOUR_TELEGRAM_CHAT_ID>'" \
  --deliver \
  --channel telegram \
  --to "<YOUR_TELEGRAM_CHAT_ID>"
```

```bash
openclaw cron add \
  --name "RE Engine: LinkedIn ingest PM (silent)" \
  --cron "30 16 * * *" \
  --tz "America/Edmonton" \
  --session isolated \
  --message "Execute: RE_TELEGRAM_ALERT_TARGET='<YOUR_TELEGRAM_CHAT_ID>' python3 '<WORKSPACE>/realestate-engine/scripts/social_ingest_run.py' --data-dir '<WORKSPACE>/realestate-engine/data' --platform linkedin --url 'https://www.linkedin.com/messaging/' --alerts hot-only --telegram-target '<YOUR_TELEGRAM_CHAT_ID>'" \
  --deliver \
  --channel telegram \
  --to "<YOUR_TELEGRAM_CHAT_ID>"
```

### Job 6 — Facebook ingest (2x/day) — silent unless HOT
```bash
openclaw cron add \
  --name "RE Engine: Facebook ingest AM (silent)" \
  --cron "0 9 * * *" \
  --tz "America/Edmonton" \
  --session isolated \
  --message "Execute: RE_TELEGRAM_ALERT_TARGET='<YOUR_TELEGRAM_CHAT_ID>' python3 '<WORKSPACE>/realestate-engine/scripts/social_ingest_run.py' --data-dir '<WORKSPACE>/realestate-engine/data' --platform facebook --url 'https://www.facebook.com/messages' --alerts hot-only --telegram-target '<YOUR_TELEGRAM_CHAT_ID>'" \
  --deliver \
  --channel telegram \
  --to "<YOUR_TELEGRAM_CHAT_ID>"
```

```bash
openclaw cron add \
  --name "RE Engine: Facebook ingest PM (silent)" \
  --cron "0 17 * * *" \
  --tz "America/Edmonton" \
  --session isolated \
  --message "Execute: RE_TELEGRAM_ALERT_TARGET='<YOUR_TELEGRAM_CHAT_ID>' python3 '<WORKSPACE>/realestate-engine/scripts/social_ingest_run.py' --data-dir '<WORKSPACE>/realestate-engine/data' --platform facebook --url 'https://www.facebook.com/messages' --alerts hot-only --telegram-target '<YOUR_TELEGRAM_CHAT_ID>'" \
  --deliver \
  --channel telegram \
  --to "<YOUR_TELEGRAM_CHAT_ID>"
```

### Job 7 — Weekly stats (Friday 9:00 AM)
```bash
openclaw cron add \
  --name "RE Engine: weekly stats" \
  --cron "0 9 * * 5" \
  --tz "America/Edmonton" \
  --session isolated \
  --message "Compute weekly stats from events.csv: drafts, approvals, sent, failed, replies, hot, dnc. Deliver concise summary." \
  --deliver \
  --channel telegram \
  --to "<YOUR_TELEGRAM_CHAT_ID>"
```

---

## 13) Web Approval Steps (End-to-End)

1) Open OpenClaw Web dashboard/WebChat (use `openclaw dashboard`)
2) In WebChat run:
```text
/show_approvals
```
3) Approve one:
```text
/approve <approval_id>
```
4) Wait up to ~5 minutes for approval processor
5) For LinkedIn/Facebook items, router will open the page (semi-auto). You click Post/Send.
6) Mark complete:
```bash
python3 "<WORKSPACE>/realestate-engine/scripts/mark_sent_manual.py" <approval_id> --data-dir "<WORKSPACE>/realestate-engine/data"
```

---

## 14) Upgrade Path (CSV → Neon)

Replace CSVs with Neon tables:
- leads, approvals, events, contacts, identities, handles, inbox_items

Neon is Postgres. Supabase adds extras (auth/realtime/storage) if you later want them.

---

# Appendix A — Script Contents (Copy/Paste)

This appendix contains key scripts referenced above.

---

## A1) `notify_telegram.py`

Save as:
`<WORKSPACE>/realestate-engine/scripts/notify_telegram.py`

```python
#!/usr/bin/env python3
import argparse
import subprocess


def main():
    p = argparse.ArgumentParser(description="Send a Telegram message via OpenClaw CLI")
    p.add_argument("--to", required=True, help="Telegram chat id (numeric)")
    p.add_argument("--text", required=True, help="Message text")
    args = p.parse_args()

    subprocess.run([
        "openclaw", "message", "send",
        "--channel", "telegram",
        "--target", args.to,
        "--message", args.text
    ], check=False)


if __name__ == "__main__":
    main()
```

---

## A2) `idp_social_ingest.py` (snapshot-first, UUID identities, fallback manual)

Save as:
`<WORKSPACE>/realestate-engine/scripts/idp_social_ingest.py`

```python
#!/usr/bin/env python3
import argparse
import csv
import json
import os
import re
import subprocess
import tempfile
import uuid
from datetime import datetime, timezone

from csv_utils import ensure_csv, append_event, APPROVALS_HEADERS, append_row, EVENTS_HEADERS

IDENTITIES_HEADERS = ["identity_id","full_name","company","role","city","province","notes","created_at","updated_at"]
HANDLES_HEADERS = ["identity_id","channel","handle_type","handle_value","is_primary","created_at"]
INBOX_HEADERS = ["inbox_id","ts","channel","external_thread_id","external_sender_id","sender_display_name","identity_id","lead_id","direction","text_snippet","grade","status","meta_json"]

HOT_PATTERNS = [
    r"\bhow much\b", r"\bprice\b", r"\bcost\b", r"\binterested\b", r"\byes\b",
    r"\bcall\b", r"\bbook\b", r"\bsend details\b", r"\binfo\b", r"\bmeet\b",
    r"\bavailable\b", r"\bviewing\b", r"\boffer\b", r"\bmortgage\b",
]


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def is_hot(text: str) -> bool:
    t = (text or "").lower()
    return any(re.search(p, t) for p in HOT_PATTERNS)


def grade_text(text: str) -> str:
    if is_hot(text):
        return "hot"
    t = (text or "").lower()
    if any(k in t for k in ["maybe", "later", "tell me more", "not now"]):
        return "warm"
    if any(k in t for k in ["stop", "remove", "not interested", "no thanks"]):
        return "cold"
    return "unknown"


def atomic_append_csv(path: str, headers: list[str], row: dict):
    ensure_csv(path, headers)
    with open(path, "r", newline="", encoding="utf-8") as f:
        existing = list(csv.DictReader(f))

    existing.append({h: row.get(h, "") for h in headers})

    dir_name = os.path.dirname(path)
    fd, tmp_path = tempfile.mkstemp(prefix=".tmp_", suffix=".csv", dir=dir_name)
    try:
        with os.fdopen(fd, "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=headers)
            w.writeheader()
            for r in existing:
                w.writerow({h: r.get(h, "") for h in headers})
        os.replace(tmp_path, path)
    finally:
        try:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
        except Exception:
            pass


def run_json(cmd: list[str]):
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError(res.stderr.strip())
    out = res.stdout.strip()
    return json.loads(out) if out else None


def snapshot_text_from_browser(url: str) -> dict:
    subprocess.run(["openclaw","browser","--browser-profile","openclaw","start"], capture_output=True, text=True)
    subprocess.run(["openclaw","browser","--browser-profile","openclaw","open",url], capture_output=True, text=True)
    snap = run_json(["openclaw","browser","--browser-profile","openclaw","snapshot","--interactive","--json"])
    return snap or {}


def extract_best_effort(snap: dict) -> tuple[str,str,str,str]:
    sender_name = ""
    profile_url = ""
    thread_id = ""
    message_snippet = ""

    text_blob = ""
    if isinstance(snap, dict):
        if "text" in snap and isinstance(snap["text"], str):
            text_blob = snap["text"]
        elif "lines" in snap and isinstance(snap["lines"], list):
            text_blob = "\n".join([str(x) for x in snap["lines"]])
        else:
            text_blob = json.dumps(snap)[:5000]

    lines = [l.strip() for l in text_blob.splitlines() if l.strip()]
    if lines:
        sender_name = lines[0][:120]
        rest = " ".join(lines[1:]) if len(lines) > 1 else ""
        message_snippet = (rest[:400] + "…") if len(rest) > 400 else rest

    return sender_name, profile_url, thread_id, message_snippet


def main():
    p = argparse.ArgumentParser(description="IDP ingest for LinkedIn/Facebook messages (snapshot-first, no OCR).")
    p.add_argument("--data-dir", required=True)
    p.add_argument("--platform", required=True, choices=["linkedin","facebook"])

    p.add_argument("--url", default="", help="Conversation/thread URL (preferred)")

    p.add_argument("--sender-name", default="")
    p.add_argument("--profile-url", default="")
    p.add_argument("--text", default="")

    p.add_argument("--direction", default="inbound", choices=["inbound","outbound"])
    p.add_argument("--campaign", default="re_engine_social_ingest")
    args = p.parse_args()

    data_dir = args.data_dir
    approvals_path = os.path.join(data_dir, "approvals.csv")
    events_path = os.path.join(data_dir, "events.csv")
    identities_path = os.path.join(data_dir, "identities.csv")
    handles_path = os.path.join(data_dir, "handles.csv")
    inbox_path = os.path.join(data_dir, "inbox_items.csv")

    ensure_csv(approvals_path, APPROVALS_HEADERS)
    ensure_csv(events_path, EVENTS_HEADERS)
    ensure_csv(identities_path, IDENTITIES_HEADERS)
    ensure_csv(handles_path, HANDLES_HEADERS)
    ensure_csv(inbox_path, INBOX_HEADERS)

    sender_name = args.sender_name.strip()
    profile_url = args.profile_url.strip()
    thread_id = ""
    text_snippet = args.text.strip()

    snapshot_used = False

    if args.url:
        try:
            snap = snapshot_text_from_browser(args.url)
            s_name, p_url, t_id, snippet = extract_best_effort(snap)
            sender_name = sender_name or s_name
            profile_url = profile_url or p_url
            thread_id = thread_id or t_id
            text_snippet = text_snippet or snippet
            snapshot_used = True
        except Exception as e:
            append_event(
                data_dir=data_dir,
                lead_id="",
                channel=args.platform,
                event_type="social_snapshot_failed",
                campaign=args.campaign,
                meta={"url": args.url, "error": str(e)}
            )

    if not sender_name:
        raise SystemExit("Missing sender name. Provide --sender-name or use --url with a working snapshot.")
    if not text_snippet:
        raise SystemExit("Missing message text/snippet. Provide --text or use --url with a working snapshot.")

    identity_id = str(uuid.uuid4())
    ts = now_iso()

    atomic_append_csv(identities_path, IDENTITIES_HEADERS, {
        "identity_id": identity_id,
        "full_name": sender_name,
        "company": "",
        "role": "",
        "city": "",
        "province": "",
        "notes": "",
        "created_at": ts,
        "updated_at": ts,
    })

    if profile_url:
        atomic_append_csv(handles_path, HANDLES_HEADERS, {
            "identity_id": identity_id,
            "channel": args.platform,
            "handle_type": "profile_url",
            "handle_value": profile_url,
            "is_primary": "true",
            "created_at": ts
        })

    inbox_id = f"inb_{uuid.uuid4().hex[:12]}"
    grade = grade_text(text_snippet)

    atomic_append_csv(inbox_path, INBOX_HEADERS, {
        "inbox_id": inbox_id,
        "ts": ts,
        "channel": args.platform,
        "external_thread_id": thread_id,
        "external_sender_id": "",
        "sender_display_name": sender_name,
        "identity_id": identity_id,
        "lead_id": "",
        "direction": args.direction,
        "text_snippet": (text_snippet[:500] + "…") if len(text_snippet) > 500 else text_snippet,
        "grade": grade,
        "status": "new",
        "meta_json": json.dumps({"url": args.url, "profile_url": profile_url}, ensure_ascii=False)
    })

    append_event(
        data_dir=data_dir,
        lead_id="",
        channel=args.platform,
        event_type="social_ingested",
        campaign=args.campaign,
        meta={"inbox_id": inbox_id, "identity_id": identity_id, "grade": grade, "profile_url": profile_url, "snapshot_used": snapshot_used}
    )

    hot_created = 0
    if grade == "hot":
        approval_id = f"soc_{uuid.uuid4().hex[:10]}"
        draft_text = (
            "Thanks for the message — quick question so I can send the right details:\n\n"
            "Are you looking to buy, sell, or invest — and what timeline are you working with?"
        )
        append_row(approvals_path, APPROVALS_HEADERS, {
            "approval_id": approval_id,
            "ts_created": ts,
            "lead_id": "",
            "channel": args.platform,
            "action_type": "dm",
            "draft_subject": "",
            "draft_text": draft_text,
            "draft_to": profile_url,
            "status": "pending",
            "approved_by": "",
            "approved_at": "",
            "notes": f"inbox_id={inbox_id};identity_id={identity_id}"
        })
        append_event(
            data_dir=data_dir,
            lead_id="",
            channel=args.platform,
            event_type="hot_reply_draft_created",
            campaign=args.campaign,
            meta={"approval_id": approval_id, "inbox_id": inbox_id, "identity_id": identity_id}
        )
        hot_created = 1

    result = {
        "platform": args.platform,
        "inbox_id": inbox_id,
        "identity_id": identity_id,
        "grade": grade,
        "hot_created": hot_created,
        "contact_capture_created": 0,
        "snapshot_used": snapshot_used,
        "profile_url_present": True if profile_url else False
    }
    print(json.dumps(result))


if __name__ == "__main__":
    main()
```

---

## A3) `social_ingest_run.py` (silent unless hot) — FIXED

Save as:
`<WORKSPACE>/realestate-engine/scripts/social_ingest_run.py`

```python
#!/usr/bin/env python3
import argparse
import json
import os
import subprocess
from datetime import datetime, timezone


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def run_capture(cmd: list[str]) -> tuple[int, str, str]:
    res = subprocess.run(cmd, capture_output=True, text=True)
    return res.returncode, res.stdout.strip(), res.stderr.strip()


def notify_telegram(chat_id: str, text: str):
    subprocess.run([
        "openclaw", "message", "send",
        "--channel", "telegram",
        "--target", chat_id,
        "--message", text
    ], check=False)


def main():
    p = argparse.ArgumentParser(description="Run LI/FB ingest and only alert Telegram when hot items are created.")
    p.add_argument("--data-dir", required=True)
    p.add_argument("--platform", required=True, choices=["linkedin", "facebook"])
    p.add_argument("--url", required=True)
    p.add_argument("--telegram-target", default=os.environ.get("RE_TELEGRAM_ALERT_TARGET", ""))
    p.add_argument("--alerts", default="hot-only", choices=["hot-only", "always", "off"])
    args = p.parse_args()

    cmd = [
        "python3",
        os.path.join(os.path.dirname(__file__), "idp_social_ingest.py"),
        "--data-dir", args.data_dir,
        "--platform", args.platform,
        "--url", args.url
    ]

    code, out, err = run_capture(cmd)

    if code != 0 or not out:
        return

    try:
        result = json.loads(out.splitlines()[-1])
    except Exception:
        return

    hot_created = int(result.get("hot_created", 0))
    contact_created = int(result.get("contact_capture_created", 0))

    if args.alerts == "off":
        return

    if args.alerts == "always":
        if args.telegram_target:
            notify_telegram(
                args.telegram_target,
                f"[RE-ENGINE] SOCIAL_INGEST | {args.platform} | hot={hot_created} capture={contact_created} @ {now_iso()}"
            )
        return

    if (hot_created > 0 or contact_created > 0) and args.telegram_target:
        notify_telegram(
            args.telegram_target,
            f"[RE-ENGINE] HOT_INBOUND | {args.platform} | hot={hot_created} capture={contact_created} — open Web dashboard → /show_approvals"
        )


if __name__ == "__main__":
    main()
```

---

# Appendix B — Remaining Production Scripts (Copy/Paste)

This appendix contains the rest of the scripts needed to run the engine end-to-end.

## B1) `csv_utils.py`

Save as:
`<WORKSPACE>/realestate-engine/scripts/csv_utils.py`

```python
#!/usr/bin/env python3
"""CSV utilities with atomic writes and strict header validation.

This module is intentionally dependency-free (Python stdlib only).

Key rules:
- Always write via temp file + os.replace (atomic on macOS)
- Keep CSV headers stable (schema drift causes silent data corruption)
"""

from __future__ import annotations

import csv
import json
import os
import tempfile
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple

DATA_DIR_DEFAULT = os.path.expanduser("~/.openclaw/workspace/realestate-engine/data")

APPROVALS_HEADERS = [
    "approval_id", "ts_created", "lead_id", "channel", "action_type",
    "draft_subject", "draft_text", "draft_to",
    "status", "approved_by", "approved_at", "notes"
]

EVENTS_HEADERS = [
    "event_id", "ts", "lead_id", "channel", "event_type",
    "campaign", "message_id", "meta_json"
]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _read_csv_rows(path: str) -> Tuple[List[str], List[Dict[str, str]]]:
    if not os.path.exists(path):
        raise FileNotFoundError(f"Missing file: {path}")
    with open(path, "r", newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        headers = reader.fieldnames or []
        rows = [dict(r) for r in reader]
    return headers, rows


def _atomic_write_csv(path: str, headers: List[str], rows: List[Dict[str, str]]) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    dir_name = os.path.dirname(path)

    fd, tmp_path = tempfile.mkstemp(prefix=".tmp_", suffix=".csv", dir=dir_name)
    try:
        with os.fdopen(fd, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=headers, extrasaction="ignore")
            writer.writeheader()
            for row in rows:
                out = {h: row.get(h, "") for h in headers}
                writer.writerow(out)
        os.replace(tmp_path, path)
    finally:
        try:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
        except Exception:
            pass


def ensure_csv(path: str, headers: List[str]) -> None:
    if os.path.exists(path):
        existing_headers, _ = _read_csv_rows(path)
        if existing_headers != headers:
            raise ValueError(
                f"CSV headers mismatch for {path}\nExpected: {headers}\nFound: {existing_headers}"
            )
        return
    _atomic_write_csv(path, headers, [])


def append_row(path: str, headers: List[str], row: Dict[str, str]) -> None:
    ensure_csv(path, headers)
    existing_headers, rows = _read_csv_rows(path)
    if existing_headers != headers:
        raise ValueError(
            f"CSV headers mismatch for {path}\nExpected: {headers}\nFound: {existing_headers}"
        )

    rows.append({h: row.get(h, "") for h in headers})
    _atomic_write_csv(path, headers, rows)


def load_approvals(data_dir: str) -> Tuple[str, List[Dict[str, str]]]:
    path = os.path.join(data_dir, "approvals.csv")
    ensure_csv(path, APPROVALS_HEADERS)
    headers, rows = _read_csv_rows(path)
    if headers != APPROVALS_HEADERS:
        raise ValueError(f"approvals.csv headers mismatch: {headers}")
    return path, rows


def save_approvals(path: str, rows: List[Dict[str, str]]) -> None:
    _atomic_write_csv(path, APPROVALS_HEADERS, rows)


def find_approval(rows: List[Dict[str, str]], approval_id: str) -> Tuple[int, Dict[str, str]]:
    target = approval_id.strip()
    for i, r in enumerate(rows):
        if (r.get("approval_id") or "").strip() == target:
            return i, r
    raise ValueError(f"approval_id not found: {approval_id}")


def append_event(
    *,
    data_dir: str,
    lead_id: str,
    channel: str,
    event_type: str,
    campaign: str = "realestate-engine",
    message_id: str = "",
    meta: Optional[dict] = None,
) -> None:
    events_path = os.path.join(data_dir, "events.csv")
    ensure_csv(events_path, EVENTS_HEADERS)

    headers, rows = _read_csv_rows(events_path)
    if headers != EVENTS_HEADERS:
        raise ValueError(
            f"events.csv headers mismatch\nExpected: {EVENTS_HEADERS}\nFound: {headers}"
        )

    event = {
        "event_id": f"evt_{int(datetime.now(timezone.utc).timestamp()*1000)}",
        "ts": now_iso(),
        "lead_id": lead_id or "",
        "channel": channel or "",
        "event_type": event_type,
        "campaign": campaign,
        "message_id": message_id,
        "meta_json": json.dumps(meta or {}, ensure_ascii=False),
    }
    rows.append(event)
    _atomic_write_csv(events_path, EVENTS_HEADERS, rows)
```

## B2) `lead_store.py`

Save as:
`<WORKSPACE>/realestate-engine/scripts/lead_store.py`

```python
#!/usr/bin/env python3
"""Lead store management.

- Loads and atomically rewrites leads.csv
- Provides safe status transitions
"""

from __future__ import annotations

import csv
import os
import tempfile
from datetime import datetime, timezone
from typing import Dict, List, Tuple

LEADS_HEADERS = [
    "lead_id","first_name","last_name","email","phone_e164","city","province",
    "source","tags","status","created_at"
]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def load_leads(leads_csv_path: str) -> Tuple[List[str], List[Dict[str, str]]]:
    if not os.path.exists(leads_csv_path):
        raise FileNotFoundError(f"Missing leads.csv: {leads_csv_path}")
    with open(leads_csv_path, "r", newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        headers = reader.fieldnames or []
        rows = [dict(r) for r in reader]
    return headers, rows


def save_leads_atomic(leads_csv_path: str, headers: List[str], rows: List[Dict[str, str]]) -> None:
    dir_name = os.path.dirname(leads_csv_path)
    os.makedirs(dir_name, exist_ok=True)

    fd, tmp_path = tempfile.mkstemp(prefix=".tmp_leads_", suffix=".csv", dir=dir_name)
    try:
        with os.fdopen(fd, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=headers, extrasaction="ignore")
            writer.writeheader()
            for r in rows:
                writer.writerow({h: r.get(h, "") for h in headers})
        os.replace(tmp_path, leads_csv_path)
    finally:
        try:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
        except Exception:
            pass


def update_lead_status_if_in(leads_csv_path: str, lead_id: str, allowed_current: list[str], new_status: str) -> bool:
    headers, rows = load_leads(leads_csv_path)
    allowed = {s.strip().lower() for s in allowed_current}

    updated = False
    for r in rows:
        if (r.get("lead_id") or "").strip() == lead_id.strip():
            current = (r.get("status") or "").strip().lower()
            if current in allowed:
                r["status"] = new_status
                updated = True
            break

    if updated:
        save_leads_atomic(leads_csv_path, headers, rows)

    return updated
```

## B3) `lead_lookup.py`

Save as:
`<WORKSPACE>/realestate-engine/scripts/lead_lookup.py`

```python
#!/usr/bin/env python3
"""Robust email → lead_id mapping.

Supports:
- exact match
- plus-address stripping (name+tag@domain)
- candidate list matching (Reply-To, From, Return-Path)
"""

from __future__ import annotations

import csv
import os
import re
from typing import Dict, Optional, Tuple

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _norm_email(addr: str) -> str:
    return (addr or "").strip().lower()


def _strip_plus(addr: str) -> str:
    if "@" not in addr:
        return addr
    local, domain = addr.split("@", 1)
    if "+" in local:
        local = local.split("+", 1)[0]
    return f"{local}@{domain}".lower()


def _is_email(addr: str) -> bool:
    return bool(EMAIL_RE.match(_norm_email(addr)))


def build_email_index(leads_csv_path: str) -> Dict[str, str]:
    if not os.path.exists(leads_csv_path):
        raise FileNotFoundError(f"Missing leads.csv: {leads_csv_path}")

    index: Dict[str, str] = {}

    with open(leads_csv_path, "r", newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    for r in rows:
        lead_id = (r.get("lead_id") or "").strip()
        email = _norm_email(r.get("email") or "")
        if not lead_id or not _is_email(email):
            continue
        index[email] = lead_id
        index[_strip_plus(email)] = lead_id

    return index


def resolve_lead_id(email_candidates: list[str], email_index: Dict[str, str]) -> Tuple[str, Optional[str]]:
    for raw in email_candidates:
        e = _norm_email(raw)
        if not _is_email(e):
            continue
        if e in email_index:
            return email_index[e], e
        ep = _strip_plus(e)
        if ep in email_index:
            return email_index[ep], ep
    return "", None
```

## B4) `spacemail_smtp_send.py`

Save as:
`<WORKSPACE>/realestate-engine/scripts/spacemail_smtp_send.py`

```python
#!/usr/bin/env python3
"""SpaceEmail SMTP sender.

Uses:
- SPACEMAIL_SMTP_HOST (default mail.spacemail.com)
- SPACEMAIL_SMTP_PORT (default 465)
- SPACEMAIL_SMTP_USER
- SPACEMAIL_SMTP_PASS

No external dependencies.
"""

from __future__ import annotations

import os
import ssl
import smtplib
from email.message import EmailMessage
from typing import Optional


def send_email(
    *,
    to_email: str,
    subject: str,
    body_text: str,
    from_email: Optional[str] = None,
    from_name: Optional[str] = None,
) -> None:
    host = os.environ.get("SPACEMAIL_SMTP_HOST", "mail.spacemail.com")
    port = int(os.environ.get("SPACEMAIL_SMTP_PORT", "465"))
    user = os.environ.get("SPACEMAIL_SMTP_USER")
    password = os.environ.get("SPACEMAIL_SMTP_PASS")

    if not user or not password:
        raise RuntimeError("Missing SPACEMAIL_SMTP_USER or SPACEMAIL_SMTP_PASS env vars.")

    if from_email is None:
        from_email = os.environ.get("RE_ENGINE_FROM_EMAIL", user)
    if from_name is None:
        from_name = os.environ.get("RE_ENGINE_FROM_NAME", "")

    msg = EmailMessage()
    msg["To"] = to_email
    msg["Subject"] = subject
    msg["From"] = f"{from_name} <{from_email}>" if from_name else from_email
    msg.set_content(body_text)

    if port == 465:
        context = ssl.create_default_context()
        with smtplib.SMTP_SSL(host, port, context=context, timeout=30) as server:
            server.login(user, password)
            server.send_message(msg)
    else:
        with smtplib.SMTP(host, port, timeout=30) as server:
            server.ehlo()
            server.starttls(context=ssl.create_default_context())
            server.ehlo()
            server.login(user, password)
            server.send_message(msg)
```

## B5) `draft_daily_outreach.py`

Save as:
`<WORKSPACE>/realestate-engine/scripts/draft_daily_outreach.py`

```python
#!/usr/bin/env python3
"""Create daily outreach drafts (default 150) into approvals.csv.

Key behaviors:
- selects leads with status=new
- writes pending email drafts to approvals.csv
- logs events
- updates lead status new→drafted
- embeds footer line: Ref: <lead_id> (for reply mapping)
"""

from __future__ import annotations

import argparse
import csv
import os
import random
import re
from datetime import datetime, timezone

from csv_utils import APPROVALS_HEADERS, EVENTS_HEADERS, ensure_csv, append_row, append_event
from lead_store import update_lead_status_if_in


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def make_id(prefix: str) -> str:
    return f"{prefix}_{int(datetime.now(timezone.utc).timestamp()*1000)}_{random.randint(1000,9999)}"


def normalize_email(s: str) -> str:
    return (s or "").strip().lower()


def normalize_phone(s: str) -> str:
    return re.sub(r"\s+", "", (s or "").strip())


def load_csv(path: str) -> list[dict]:
    if not os.path.exists(path):
        raise FileNotFoundError(f"Missing file: {path}")
    with open(path, "r", newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def load_dnc(data_dir: str) -> set[str]:
    dnc_path = os.path.join(data_dir, "dnc.csv")
    if not os.path.exists(dnc_path):
        return set()
    rows = load_csv(dnc_path)
    return {(r.get("value") or "").strip().lower() for r in rows if (r.get("value") or "").strip()}


def build_email_subject(lead: dict) -> str:
    city = (lead.get("city") or "").strip()
    return f"Quick question about {city} real estate" if city else "Quick question re: real estate"


def build_email_body(lead: dict) -> str:
    first = (lead.get("first_name") or "").strip() or "there"
    city = (lead.get("city") or "").strip()
    province = (lead.get("province") or "").strip()
    lead_id = (lead.get("lead_id") or "").strip()

    region = ", ".join([p for p in [city, province] if p]) or "your area"

    body = (
        f"Hi {first},\n\n"
        f"I’m reaching out because we’re building a high-leverage real estate engine in {region} and looking for a small set of qualified conversations.\n\n"
        f"If I sent you a 2‑minute breakdown of how we generate/convert leads (and how the profit-share works), would you want to see it?\n\n"
        f"— Kirtis\n"
    )

    if lead_id:
        body += f"\nRef: {lead_id}\n"

    return body


def main():
    p = argparse.ArgumentParser(description="Create daily outreach drafts (pending) into approvals.csv")
    p.add_argument("--data-dir", required=True)
    p.add_argument("--limit", type=int, default=150)
    p.add_argument("--campaign", default="re_engine_daily_150")
    args = p.parse_args()

    data_dir = args.data_dir
    leads_path = os.path.join(data_dir, "leads.csv")
    approvals_path = os.path.join(data_dir, "approvals.csv")
    events_path = os.path.join(data_dir, "events.csv")

    ensure_csv(approvals_path, APPROVALS_HEADERS)
    ensure_csv(events_path, EVENTS_HEADERS)

    dnc = load_dnc(data_dir)
    leads = load_csv(leads_path)

    candidates = []
    for l in leads:
        status = (l.get("status") or "").strip().lower()
        email = normalize_email(l.get("email"))
        phone = normalize_phone(l.get("phone_e164"))

        if status != "new":
            continue
        if not (l.get("lead_id") or "").strip():
            continue
        if not email:
            continue
        if email in dnc or phone.lower() in dnc:
            continue

        candidates.append(l)

    random.shuffle(candidates)
    selected = candidates[: args.limit]

    created = 0
    for lead in selected:
        lead_id = (lead.get("lead_id") or "").strip()
        to_email = normalize_email(lead.get("email"))

        approval_id = make_id("appr")
        subject = build_email_subject(lead)
        body = build_email_body(lead)

        append_row(approvals_path, APPROVALS_HEADERS, {
            "approval_id": approval_id,
            "ts_created": now_iso(),
            "lead_id": lead_id,
            "channel": "email",
            "action_type": "send_email",
            "draft_subject": subject,
            "draft_text": body,
            "draft_to": to_email,
            "status": "pending",
            "approved_by": "",
            "approved_at": "",
            "notes": f"campaign={args.campaign}",
        })

        append_event(
            data_dir=data_dir,
            lead_id=lead_id,
            channel="email",
            event_type="draft_created",
            campaign=args.campaign,
            meta={"approval_id": approval_id, "to": to_email},
        )

        updated = update_lead_status_if_in(leads_path, lead_id, ["new"], "drafted")
        append_event(
            data_dir=data_dir,
            lead_id=lead_id,
            channel="email",
            event_type="lead_status_updated",
            campaign=args.campaign,
            meta={"lead_id": lead_id, "new_status": "drafted", "updated": updated},
        )

        created += 1

    print(f"Created drafts: {created}")


if __name__ == "__main__":
    main()
```

## B6) `poll_imap_replies.py`

Save as:
`<WORKSPACE>/realestate-engine/scripts/poll_imap_replies.py`

```python
#!/usr/bin/env python3
"""Poll SpaceEmail IMAP for replies.

- Uses Ref: <lead_id> footer tag when present
- Falls back to Reply-To/From/Return-Path mapping against leads.csv
- Logs events and creates pending reply drafts for hot messages
- Updates lead status to replied/hot
"""

from __future__ import annotations

import argparse
import email
import imaplib
import os
import random
import re
from datetime import datetime, timezone
from email.header import decode_header
from email.utils import getaddresses

from csv_utils import APPROVALS_HEADERS, EVENTS_HEADERS, ensure_csv, append_row, append_event
from lead_lookup import build_email_index, resolve_lead_id
from lead_store import update_lead_status_if_in

HOT_PATTERNS = [
    r"\bhow much\b", r"\bprice\b", r"\bcost\b", r"\binterested\b", r"\byes\b",
    r"\bcall\b", r"\bbook\b", r"\bsend details\b", r"\binfo\b", r"\bmeet\b",
]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def make_id(prefix: str) -> str:
    return f"{prefix}_{int(datetime.now(timezone.utc).timestamp()*1000)}_{random.randint(1000,9999)}"


def decode_mime_words(s: str) -> str:
    if not s:
        return ""
    parts = decode_header(s)
    out = []
    for val, enc in parts:
        if isinstance(val, bytes):
            out.append(val.decode(enc or "utf-8", errors="replace"))
        else:
            out.append(val)
    return "".join(out)


def extract_text(msg: email.message.Message) -> str:
    if msg.is_multipart():
        for part in msg.walk():
            ctype = part.get_content_type()
            disp = str(part.get("Content-Disposition") or "")
            if ctype == "text/plain" and "attachment" not in disp.lower():
                payload = part.get_payload(decode=True) or b""
                charset = part.get_content_charset() or "utf-8"
                return payload.decode(charset, errors="replace")
        for part in msg.walk():
            if part.get_content_type() == "text/html":
                payload = part.get_payload(decode=True) or b""
                charset = part.get_content_charset() or "utf-8"
                html = payload.decode(charset, errors="replace")
                html = re.sub(r"<[^>]+>", " ", html)
                html = re.sub(r"\s+", " ", html).strip()
                return html
    else:
        payload = msg.get_payload(decode=True) or b""
        charset = msg.get_content_charset() or "utf-8"
        return payload.decode(charset, errors="replace")
    return ""


def extract_ref_lead_id(text: str) -> str:
    if not text:
        return ""
    m = re.search(r"(?im)^\s*ref:\s*([a-z0-9_\-]+)\s*$", text)
    return m.group(1).strip() if m else ""


def extract_email_candidates(msg: email.message.Message) -> list[str]:
    candidates: list[str] = []
    reply_to_raw = msg.get_all("Reply-To", [])
    from_raw = msg.get_all("From", [])
    return_path_raw = msg.get_all("Return-Path", [])

    for _, addr in getaddresses(reply_to_raw):
        if addr:
            candidates.append(addr)
    for _, addr in getaddresses(from_raw):
        if addr:
            candidates.append(addr)
    for rp in return_path_raw:
        rp = (rp or "").strip().strip("<>").strip()
        if rp:
            candidates.append(rp)

    seen = set()
    out = []
    for c in candidates:
        lc = (c or "").strip().lower()
        if not lc or lc in seen:
            continue
        seen.add(lc)
        out.append(c)
    return out


def is_hot(text: str) -> bool:
    t = (text or "").lower()
    return any(re.search(p, t) for p in HOT_PATTERNS)


def main():
    p = argparse.ArgumentParser(description="Poll IMAP for unseen messages")
    p.add_argument("--data-dir", required=True)
    p.add_argument("--mailbox", default="INBOX")
    p.add_argument("--max", type=int, default=25)
    p.add_argument("--campaign", default="re_engine_imap")
    args = p.parse_args()

    data_dir = args.data_dir
    approvals_path = os.path.join(data_dir, "approvals.csv")
    events_path = os.path.join(data_dir, "events.csv")
    leads_path = os.path.join(data_dir, "leads.csv")

    ensure_csv(approvals_path, APPROVALS_HEADERS)
    ensure_csv(events_path, EVENTS_HEADERS)

    email_index = build_email_index(leads_path) if os.path.exists(leads_path) else {}

    user = os.environ.get("SPACEMAIL_USER")
    password = os.environ.get("SPACEMAIL_PASS")
    host = os.environ.get("SPACEMAIL_IMAP_HOST", "mail.spacemail.com")
    port = int(os.environ.get("SPACEMAIL_IMAP_PORT", "993"))

    if not user or not password:
        raise RuntimeError("Missing SPACEMAIL_USER or SPACEMAIL_PASS env vars.")

    mail = imaplib.IMAP4_SSL(host, port)
    mail.login(user, password)
    mail.select(args.mailbox)

    status, data = mail.search(None, "UNSEEN")
    if status != "OK":
        mail.logout()
        raise RuntimeError("IMAP search failed")

    msg_ids = data[0].split()
    if not msg_ids:
        mail.logout()
        print("No unseen messages.")
        return

    processed = 0
    for msg_id in msg_ids[: args.max]:
        status, msg_data = mail.fetch(msg_id, "(RFC822)")
        if status != "OK":
            continue

        raw = msg_data[0][1]
        msg = email.message_from_bytes(raw)

        subject = decode_mime_words(msg.get("Subject", ""))
        text = extract_text(msg)
        snippet = re.sub(r"\s+", " ", (text or "")).strip()
        if len(snippet) > 400:
            snippet = snippet[:400] + "…"

        ref_lead_id = extract_ref_lead_id(text)
        candidates = extract_email_candidates(msg)

        if ref_lead_id:
            lead_id, matched_email = ref_lead_id, None
        else:
            lead_id, matched_email = resolve_lead_id(candidates, email_index)

        append_event(
            data_dir=data_dir,
            lead_id=lead_id,
            channel="email",
            event_type="reply_received",
            campaign=args.campaign,
            meta={"subject": subject, "snippet": snippet, "ref_lead_id": ref_lead_id, "matched_email": matched_email, "email_candidates": candidates},
        )

        if lead_id and os.path.exists(leads_path):
            updated = update_lead_status_if_in(leads_path, lead_id, ["sent", "drafted", "new"], "replied")
            append_event(
                data_dir=data_dir,
                lead_id=lead_id,
                channel="email",
                event_type="lead_status_updated",
                campaign=args.campaign,
                meta={"lead_id": lead_id, "new_status": "replied", "updated": updated},
            )

        if is_hot(text):
            approval_id = make_id("appr")
            draft_to = matched_email or (candidates[0] if candidates else "")
            draft_subject = f"Re: {subject}" if subject else "Re:"
            draft_text = (
                "Thanks for the reply — quick question so I can send the right details:\n\n"
                "Are you looking to buy, sell, or invest — and what timeline are you working with?\n\n"
                "If you want, I can also send a short breakdown of the system + next steps."
            )

            append_row(approvals_path, APPROVALS_HEADERS, {
                "approval_id": approval_id,
                "ts_created": now_iso(),
                "lead_id": lead_id,
                "channel": "email",
                "action_type": "reply",
                "draft_subject": draft_subject,
                "draft_text": draft_text,
                "draft_to": draft_to,
                "status": "pending",
                "approved_by": "",
                "approved_at": "",
                "notes": "hot_reply_draft",
            })

            append_event(
                data_dir=data_dir,
                lead_id=lead_id,
                channel="email",
                event_type="hot_reply_draft_created",
                campaign=args.campaign,
                meta={"approval_id": approval_id, "to": draft_to, "ref_lead_id": ref_lead_id},
            )

            if lead_id and os.path.exists(leads_path):
                updated_hot = update_lead_status_if_in(leads_path, lead_id, ["replied", "sent", "drafted", "new"], "hot")
                append_event(
                    data_dir=data_dir,
                    lead_id=lead_id,
                    channel="email",
                    event_type="lead_status_updated",
                    campaign=args.campaign,
                    meta={"lead_id": lead_id, "new_status": "hot", "updated": updated_hot},
                )

        mail.store(msg_id, "+FLAGS", "\\Seen")
        processed += 1

    mail.logout()
    print(f"Processed unseen messages: {processed}")


if __name__ == "__main__":
    main()
```

## B7) `send_approved_router.py`

Save as:
`<WORKSPACE>/realestate-engine/scripts/send_approved_router.py`

```python
#!/usr/bin/env python3
"""Process approvals.csv rows with status=approved and dispatch sends.

Supports channels:
- email: SpaceEmail SMTP
- whatsapp: openclaw message send
- telegram: openclaw message send
- linkedin/facebook: semi-auto open page and mark approved_opened

Never sends unless status=approved.
"""

from __future__ import annotations

import argparse
import os
import subprocess
from datetime import datetime, timezone
from typing import Dict, List

from csv_utils import load_approvals, save_approvals, append_event
from spacemail_smtp_send import send_email
from lead_store import update_lead_status_if_in


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def run_cmd(cmd: List[str]) -> str:
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError(f"Command failed ({res.returncode}): {' '.join(cmd)}\n{res.stderr.strip()}")
    return res.stdout.strip()


def send_whatsapp(target: str, text: str) -> None:
    run_cmd(["openclaw", "message", "send", "--channel", "whatsapp", "--target", target, "--message", text])


def send_telegram(target: str, text: str) -> None:
    run_cmd(["openclaw", "message", "send", "--channel", "telegram", "--target", target, "--message", text])


def open_social(platform: str, draft_to: str) -> None:
    url = draft_to.strip() if draft_to.strip().startswith("http") else (
        "https://www.linkedin.com/feed/" if platform == "linkedin" else "https://www.facebook.com/"
    )
    try:
        run_cmd(["openclaw", "browser", "--browser-profile", "openclaw", "start"])
    except Exception:
        pass
    try:
        run_cmd(["openclaw", "browser", "--browser-profile", "openclaw", "open", url])
    except Exception:
        return


def process_row(row: Dict[str, str], data_dir: str, leads_path: str) -> Dict[str, str]:
    channel = (row.get("channel") or "").strip().lower()
    action_type = (row.get("action_type") or "").strip().lower()
    lead_id = (row.get("lead_id") or "").strip()
    approval_id = (row.get("approval_id") or "").strip()

    draft_to = (row.get("draft_to") or "").strip()
    subject = (row.get("draft_subject") or "").strip()
    text = (row.get("draft_text") or "").strip()

    try:
        if channel == "email":
            if not draft_to:
                raise ValueError("Missing draft_to for email")
            send_email(to_email=draft_to, subject=subject or "(no subject)", body_text=text)
            row["status"] = "sent"
            append_event(data_dir=data_dir, lead_id=lead_id, channel="email", event_type="sent", meta={"approval_id": approval_id, "action_type": action_type, "to": draft_to})
            if lead_id and os.path.exists(leads_path):
                updated = update_lead_status_if_in(leads_path, lead_id, ["drafted", "new"], "sent")
                append_event(data_dir=data_dir, lead_id=lead_id, channel="email", event_type="lead_status_updated", meta={"lead_id": lead_id, "new_status": "sent", "updated": updated})
            return row

        if channel == "whatsapp":
            if not draft_to:
                raise ValueError("Missing draft_to (phone) for whatsapp")
            send_whatsapp(draft_to, text)
            row["status"] = "sent"
            append_event(data_dir=data_dir, lead_id=lead_id, channel="whatsapp", event_type="sent", meta={"approval_id": approval_id, "action_type": action_type, "to": draft_to})
            if lead_id and os.path.exists(leads_path):
                updated = update_lead_status_if_in(leads_path, lead_id, ["drafted", "new"], "sent")
                append_event(data_dir=data_dir, lead_id=lead_id, channel="whatsapp", event_type="lead_status_updated", meta={"lead_id": lead_id, "new_status": "sent", "updated": updated})
            return row

        if channel == "telegram":
            if not draft_to:
                raise ValueError("Missing draft_to (chat id) for telegram")
            send_telegram(draft_to, text)
            row["status"] = "sent"
            append_event(data_dir=data_dir, lead_id=lead_id, channel="telegram", event_type="sent", meta={"approval_id": approval_id, "action_type": action_type, "to": draft_to})
            if lead_id and os.path.exists(leads_path):
                updated = update_lead_status_if_in(leads_path, lead_id, ["drafted", "new"], "sent")
                append_event(data_dir=data_dir, lead_id=lead_id, channel="telegram", event_type="lead_status_updated", meta={"lead_id": lead_id, "new_status": "sent", "updated": updated})
            return row

        if channel in ("linkedin", "facebook"):
            open_social(channel, draft_to)
            row["status"] = "approved_opened"
            append_event(data_dir=data_dir, lead_id=lead_id, channel=channel, event_type="approved_opened", meta={"approval_id": approval_id, "action_type": action_type, "to": draft_to})
            return row

        raise ValueError(f"Unsupported channel: {channel}")

    except Exception as e:
        row["status"] = "failed"
        row["notes"] = f"{now_iso()} failed: {str(e)}"
        append_event(data_dir=data_dir, lead_id=lead_id, channel=channel or "unknown", event_type="failed", meta={"approval_id": approval_id, "error": str(e), "action_type": action_type})
        return row


def main():
    p = argparse.ArgumentParser(description="Process approved items in approvals.csv")
    p.add_argument("--data-dir", required=True)
    p.add_argument("--max", type=int, default=20)
    args = p.parse_args()

    approvals_path, rows = load_approvals(args.data_dir)
    leads_path = os.path.join(args.data_dir, "leads.csv")

    updated = 0
    for i in range(len(rows)):
        if updated >= args.max:
            break
        status = (rows[i].get("status") or "").strip().lower()
        if status != "approved":
            continue
        rows[i] = process_row(rows[i], args.data_dir, leads_path)
        updated += 1

    if updated > 0:
        save_approvals(approvals_path, rows)

    print(f"Processed approved rows: {updated}")


if __name__ == "__main__":
    main()
```

## B8) Approval CLI scripts

### `show_approvals.py`
Save as `<WORKSPACE>/realestate-engine/scripts/show_approvals.py`

```python
#!/usr/bin/env python3
import argparse
from csv_utils import load_approvals


def main():
    p = argparse.ArgumentParser(description="Show approvals")
    p.add_argument("--data-dir", required=True)
    p.add_argument("--status", default="pending")
    p.add_argument("--limit", type=int, default=50)
    args = p.parse_args()

    path, rows = load_approvals(args.data_dir)
    status = args.status.strip().lower()
    filtered = [r for r in rows if (r.get("status") or "").strip().lower() == status]

    print(f"Approvals file: {path}")
    print(f"Showing status='{status}' count={len(filtered)}\n")

    for r in filtered[: args.limit]:
        approval_id = (r.get("approval_id") or "").strip()
        channel = (r.get("channel") or "").strip()
        action = (r.get("action_type") or "").strip()
        lead_id = (r.get("lead_id") or "").strip()
        draft_to = (r.get("draft_to") or "").strip()
        subj = (r.get("draft_subject") or "").strip()
        text = (r.get("draft_text") or "").replace("\n", " ").strip()
        preview = text[:160] + ("…" if len(text) > 160 else "")

        line = f"- {approval_id} | {channel} | {action} | lead={lead_id} | to={draft_to}"
        if subj:
            line += f" | subject={subj}"
        print(line)
        print(f"  preview: {preview}\n")


if __name__ == "__main__":
    main()
```

### `approve.py`
Save as `<WORKSPACE>/realestate-engine/scripts/approve.py`

```python
#!/usr/bin/env python3
import argparse
from csv_utils import load_approvals, save_approvals, find_approval, now_iso, append_event


def main():
    p = argparse.ArgumentParser(description="Approve an approval_id")
    p.add_argument("--data-dir", required=True)
    p.add_argument("approval_id")
    p.add_argument("--by", default="web-dashboard")
    args = p.parse_args()

    approvals_path, rows = load_approvals(args.data_dir)
    idx, row = find_approval(rows, args.approval_id)

    status = (row.get("status") or "").strip().lower()
    if status in ("sent", "approved"):
        print(f"No change (status={status}).")
        return

    row["status"] = "approved"
    row["approved_by"] = args.by
    row["approved_at"] = now_iso()
    rows[idx] = row

    save_approvals(approvals_path, rows)

    append_event(
        data_dir=args.data_dir,
        lead_id=row.get("lead_id", "") or "",
        channel=row.get("channel", "") or "",
        event_type="approve",
        meta={"approval_id": args.approval_id, "approved_by": args.by}
    )

    print(f"Approved: {args.approval_id}")


if __name__ == "__main__":
    main()
```

### `reject.py`
Save as `<WORKSPACE>/realestate-engine/scripts/reject.py`

```python
#!/usr/bin/env python3
import argparse
from csv_utils import load_approvals, save_approvals, find_approval, now_iso, append_event


def main():
    p = argparse.ArgumentParser(description="Reject an approval_id")
    p.add_argument("--data-dir", required=True)
    p.add_argument("approval_id")
    p.add_argument("--reason", default="rejected")
    p.add_argument("--by", default="web-dashboard")
    args = p.parse_args()

    approvals_path, rows = load_approvals(args.data_dir)
    idx, row = find_approval(rows, args.approval_id)

    status = (row.get("status") or "").strip().lower()
    if status == "sent":
        print("Already sent; cannot reject.")
        return

    row["status"] = "rejected"
    row["approved_by"] = args.by
    row["approved_at"] = now_iso()
    row["notes"] = args.reason
    rows[idx] = row

    save_approvals(approvals_path, rows)

    append_event(
        data_dir=args.data_dir,
        lead_id=row.get("lead_id", "") or "",
        channel=row.get("channel", "") or "",
        event_type="reject",
        meta={"approval_id": args.approval_id, "rejected_by": args.by, "reason": args.reason}
    )

    print(f"Rejected: {args.approval_id}")


if __name__ == "__main__":
    main()
```

### `edit.py`
Save as `<WORKSPACE>/realestate-engine/scripts/edit.py`

```python
#!/usr/bin/env python3
import argparse
from csv_utils import load_approvals, save_approvals, find_approval, append_event


def main():
    p = argparse.ArgumentParser(description="Edit an approval draft")
    p.add_argument("--data-dir", required=True)
    p.add_argument("approval_id")
    p.add_argument("--text", default=None)
    p.add_argument("--subject", default=None)
    p.add_argument("--to", default=None)
    args = p.parse_args()

    if args.text is None and args.subject is None and args.to is None:
        raise SystemExit("Nothing to edit. Provide --text and/or --subject and/or --to")

    approvals_path, rows = load_approvals(args.data_dir)
    idx, row = find_approval(rows, args.approval_id)

    status = (row.get("status") or "").strip().lower()
    if status == "sent":
        print("Already sent; cannot edit.")
        return

    if args.text is not None:
        row["draft_text"] = args.text
    if args.subject is not None:
        row["draft_subject"] = args.subject
    if args.to is not None:
        row["draft_to"] = args.to

    # reset approval
    row["status"] = "pending"
    row["approved_by"] = ""
    row["approved_at"] = ""

    rows[idx] = row
    save_approvals(approvals_path, rows)

    append_event(
        data_dir=args.data_dir,
        lead_id=row.get("lead_id", "") or "",
        channel=row.get("channel", "") or "",
        event_type="edit",
        meta={"approval_id": args.approval_id}
    )

    print(f"Edited (reset to pending): {args.approval_id}")


if __name__ == "__main__":
    main()
```

## B9) `contacts_add.py`

Save as:
`<WORKSPACE>/realestate-engine/scripts/contacts_add.py`

```python
#!/usr/bin/env python3
import argparse
import csv
import os
import tempfile

HEADERS = ["lead_id", "channel", "external_id"]


def atomic_upsert(path: str, row: dict):
    os.makedirs(os.path.dirname(path), exist_ok=True)

    existing = []
    if os.path.exists(path):
        with open(path, "r", newline="", encoding="utf-8") as f:
            existing = list(csv.DictReader(f))

    updated = False
    for r in existing:
        if (r.get("channel") or "").strip().lower() == row["channel"] and (r.get("external_id") or "").strip() == row["external_id"]:
            r["lead_id"] = row["lead_id"]
            updated = True
            break

    if not updated:
        existing.append(row)

    fd, tmp_path = tempfile.mkstemp(prefix=".tmp_contacts_", suffix=".csv", dir=os.path.dirname(path))
    try:
        with os.fdopen(fd, "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=HEADERS)
            w.writeheader()
            for r in existing:
                w.writerow({h: r.get(h, "") for h in HEADERS})
        os.replace(tmp_path, path)
    finally:
        try:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
        except Exception:
            pass


def main():
    p = argparse.ArgumentParser(description="Add/update contacts.csv mapping")
    p.add_argument("--data-dir", required=True)
    p.add_argument("--lead-id", required=True)
    p.add_argument("--channel", required=True, choices=["whatsapp", "telegram"])
    p.add_argument("--external-id", required=True)
    args = p.parse_args()

    if args.channel == "telegram" and not args.external_id.isdigit():
        raise SystemExit("Telegram external-id must be numeric user id.")

    path = os.path.join(args.data_dir, "contacts.csv")
    atomic_upsert(path, {
        "lead_id": args.lead_id.strip(),
        "channel": args.channel.strip().lower(),
        "external_id": args.external_id.strip(),
    })

    print("contacts.csv updated")


if __name__ == "__main__":
    main()
```

## B10) `contact_capture.py`

Save as:
`<WORKSPACE>/realestate-engine/scripts/contact_capture.py`

```python
#!/usr/bin/env python3
import argparse
import os
import random
from datetime import datetime, timezone

from csv_utils import APPROVALS_HEADERS, ensure_csv, append_row, append_event


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def make_id(prefix: str) -> str:
    return f"{prefix}_{int(datetime.now(timezone.utc).timestamp()*1000)}_{random.randint(1000,9999)}"


def main():
    p = argparse.ArgumentParser(description="Create contact capture approval")
    p.add_argument("--data-dir", required=True)
    p.add_argument("--channel", required=True, choices=["whatsapp", "telegram"])
    p.add_argument("--external-id", required=True)
    p.add_argument("--text", required=True)
    args = p.parse_args()

    approvals_path = os.path.join(args.data_dir, "approvals.csv")
    ensure_csv(approvals_path, APPROVALS_HEADERS)

    approval_id = make_id("cap")

    draft_text = (
        f"CONTACT CAPTURE NEEDED\n\n"
        f"Channel: {args.channel}\n"
        f"External ID: {args.external_id}\n\n"
        f"Message:\n{args.text}\n\n"
        f"Action:\n"
        f"1) Decide lead_id\n"
        f"2) Run contacts_add.py to map (lead_id, channel, external_id)\n"
        f"3) Next scan will draft replies automatically."
    )

    append_row(approvals_path, APPROVALS_HEADERS, {
        "approval_id": approval_id,
        "ts_created": now_iso(),
        "lead_id": "",
        "channel": args.channel,
        "action_type": "contact_capture",
        "draft_subject": "",
        "draft_text": draft_text,
        "draft_to": args.external_id,
        "status": "pending",
        "approved_by": "",
        "approved_at": "",
        "notes": "unknown_sender_hot_prompt",
    })

    append_event(
        data_dir=args.data_dir,
        lead_id="",
        channel=args.channel,
        event_type="contact_capture_pending",
        campaign="re_engine_contact_capture",
        meta={"approval_id": approval_id, "external_id": args.external_id},
    )

    print(f"Created contact capture approval: {approval_id}")


if __name__ == "__main__":
    main()
```

## B11) `chat_hot_router.py`

Save as:
`<WORKSPACE>/realestate-engine/scripts/chat_hot_router.py`

```python
#!/usr/bin/env python3
import argparse
import csv
import os
import random
import re
from datetime import datetime, timezone

from csv_utils import APPROVALS_HEADERS, ensure_csv, append_row, append_event
from lead_store import update_lead_status_if_in

HOT_PATTERNS = [
    r"\bhow much\b", r"\bprice\b", r"\bcost\b", r"\binterested\b", r"\byes\b",
    r"\bcall\b", r"\bbook\b", r"\bsend details\b", r"\binfo\b", r"\bmeet\b",
    r"\bavailable\b", r"\bviewing\b", r"\boffer\b", r"\bmortgage\b",
]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def make_id(prefix: str) -> str:
    return f"{prefix}_{int(datetime.now(timezone.utc).timestamp()*1000)}_{random.randint(1000,9999)}"


def is_hot(text: str) -> bool:
    t = (text or "").lower()
    return any(re.search(p, t) for p in HOT_PATTERNS)


def load_contacts_map(data_dir: str) -> dict[tuple[str, str], str]:
    path = os.path.join(data_dir, "contacts.csv")
    if not os.path.exists(path):
        return {}
    with open(path, "r", newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    out = {}
    for r in rows:
        lead_id = (r.get("lead_id") or "").strip()
        channel = (r.get("channel") or "").strip().lower()
        external_id = (r.get("external_id") or "").strip()
        if lead_id and channel and external_id:
            out[(channel, external_id)] = lead_id
    return out


def main():
    p = argparse.ArgumentParser(description="Classify WA/TG message and draft reply if hot")
    p.add_argument("--data-dir", required=True)
    p.add_argument("--channel", required=True, choices=["whatsapp", "telegram"])
    p.add_argument("--external-id", required=True)
    p.add_argument("--text", required=True)
    p.add_argument("--campaign", default="re_engine_chat")
    args = p.parse_args()

    if args.channel == "telegram" and not args.external_id.isdigit():
        raise SystemExit("Telegram external-id must be numeric user id.")

    approvals_path = os.path.join(args.data_dir, "approvals.csv")
    leads_path = os.path.join(args.data_dir, "leads.csv")
    ensure_csv(approvals_path, APPROVALS_HEADERS)

    contacts = load_contacts_map(args.data_dir)
    lead_id = contacts.get((args.channel, args.external_id), "")

    hot = is_hot(args.text)

    append_event(
        data_dir=args.data_dir,
        lead_id=lead_id,
        channel=args.channel,
        event_type="inbound_received",
        campaign=args.campaign,
        meta={"external_id": args.external_id, "hot": hot, "text": args.text[:500]},
    )

    if not hot:
        print("Not hot")
        return

    approval_id = make_id("appr")
    draft_text = (
        "Quick question so I can send the right details:\n\n"
        "Are you looking to buy, sell, or invest — and what timeline are you working with?"
    )

    append_row(approvals_path, APPROVALS_HEADERS, {
        "approval_id": approval_id,
        "ts_created": now_iso(),
        "lead_id": lead_id,
        "channel": args.channel,
        "action_type": "reply",
        "draft_subject": "",
        "draft_text": draft_text,
        "draft_to": args.external_id,
        "status": "pending",
        "approved_by": "",
        "approved_at": "",
        "notes": "hot_chat_reply_draft",
    })

    append_event(
        data_dir=args.data_dir,
        lead_id=lead_id,
        channel=args.channel,
        event_type="hot_reply_draft_created",
        campaign=args.campaign,
        meta={"approval_id": approval_id, "to": args.external_id},
    )

    if lead_id and os.path.exists(leads_path):
        updated = update_lead_status_if_in(leads_path, lead_id, ["new", "drafted", "sent", "replied", "hot"], "hot")
        append_event(
            data_dir=args.data_dir,
            lead_id=lead_id,
            channel=args.channel,
            event_type="lead_status_updated",
            campaign=args.campaign,
            meta={"lead_id": lead_id, "new_status": "hot", "updated": updated},
        )

    print(f"HOT lead detected. Draft created: {approval_id}")


if __name__ == "__main__":
    main()
```

## B12) `auto_hot_scan_sessions.py`

Save as:
`<WORKSPACE>/realestate-engine/scripts/auto_hot_scan_sessions.py`

```python
#!/usr/bin/env python3
"""Scan OpenClaw sessions and draft hot replies.

Safety rule (selected by user):
- Only draft replies if sender exists in contacts.csv
- If hot unknown sender: create contact_capture approval
- Optional Telegram alert via env vars

NOTE: Session formats vary; this is best-effort.
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import re
import subprocess


def run_json(cmd: list[str]):
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError(res.stderr.strip())
    out = res.stdout.strip()
    return json.loads(out) if out else None


def is_hot(text: str) -> bool:
    t = (text or "").lower()
    return any(k in t for k in ["how much", "price", "cost", "interested", "call", "book", "send details", "timeline"])


def load_contacts_map(data_dir: str) -> dict[tuple[str, str], str]:
    path = os.path.join(data_dir, "contacts.csv")
    if not os.path.exists(path):
        return {}
    with open(path, "r", newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    out = {}
    for r in rows:
        lead_id = (r.get("lead_id") or "").strip()
        channel = (r.get("channel") or "").strip().lower()
        external_id = (r.get("external_id") or "").strip()
        if lead_id and channel and external_id:
            out[(channel, external_id)] = lead_id
    return out


def extract_sender_id_from_session_key(session_key: str, channel: str) -> str | None:
    if not session_key:
        return None
    if channel == "whatsapp":
        m = re.search(r"(\+\d{8,15})", session_key)
        return m.group(1) if m else None
    if channel == "telegram":
        m = re.search(r"(-?\d{6,})", session_key)
        return m.group(1) if m else None
    return None


def main():
    p = argparse.ArgumentParser(description="Auto hot scan sessions")
    p.add_argument("--data-dir", required=True)
    p.add_argument("--minutes", type=int, default=60)
    p.add_argument("--per-session-messages", type=int, default=30)
    p.add_argument("--max-hot", type=int, default=25)
    args = p.parse_args()

    contacts_map = load_contacts_map(args.data_dir)
    alerts_mode = os.environ.get("RE_CONTACT_CAPTURE_ALERTS", "telegram").strip().lower()
    telegram_target = os.environ.get("RE_TELEGRAM_ALERT_TARGET", "").strip()

    sessions = run_json(["openclaw", "sessions", "--json"])
    if not sessions:
        print("No sessions.")
        return

    drafted = 0
    captures = 0

    for s in sessions:
        if drafted >= args.max_hot:
            break

        session_key = s.get("sessionKey") or s.get("key") or ""
        if "whatsapp" in session_key:
            channel = "whatsapp"
        elif "telegram" in session_key:
            channel = "telegram"
        else:
            continue

        # Fetch history
        hist = run_json(["openclaw", "sessions", "history", "--session", session_key, "--limit", str(args.per_session_messages), "--json"])
        if not hist:
            continue

        entries = hist.get("messages") or hist.get("history") or hist.get("items") or []
        if not isinstance(entries, list):
            continue

        for msg in entries:
            if drafted >= args.max_hot:
                break

            role = (msg.get("role") or msg.get("type") or "").lower()
            text = msg.get("content") or msg.get("text") or ""
            if not isinstance(text, str):
                continue
            if role not in ("user", "incoming"):
                continue
            if not is_hot(text):
                continue

            external_id = extract_sender_id_from_session_key(session_key, channel)
            if not external_id:
                continue

            # numeric-only Telegram
            if channel == "telegram" and not str(external_id).lstrip("-").isdigit():
                continue

            # Only draft replies if sender exists in contacts.csv
            if (channel, str(external_id)) not in contacts_map:
                subprocess.run([
                    "python3",
                    os.path.join(os.path.dirname(__file__), "contact_capture.py"),
                    "--data-dir", args.data_dir,
                    "--channel", channel,
                    "--external-id", str(external_id),
                    "--text", text[:500]
                ], check=False)
                captures += 1

                if alerts_mode == "telegram" and telegram_target:
                    subprocess.run([
                        "python3",
                        os.path.join(os.path.dirname(__file__), "notify_telegram.py"),
                        "--to", telegram_target,
                        "--text", f"[RE-ENGINE] CONTACT_CAPTURE | {channel} | UNKNOWN\nHot unknown sender: {external_id}\nOpen Web dashboard → /show_approvals"
                    ], check=False)

                continue

            # Draft hot reply
            subprocess.run([
                "python3",
                os.path.join(os.path.dirname(__file__), "chat_hot_router.py"),
                "--data-dir", args.data_dir,
                "--channel", channel,
                "--external-id", str(external_id),
                "--text", text
            ], check=False)

            drafted += 1

    print(f"drafted={drafted} contact_captures={captures}")


if __name__ == "__main__":
    main()
```

## B13) `draft_social.py`

Save as:
`<WORKSPACE>/realestate-engine/scripts/draft_social.py`

```python
#!/usr/bin/env python3
import argparse
import os
import random
from datetime import datetime, timezone

from csv_utils import APPROVALS_HEADERS, EVENTS_HEADERS, ensure_csv, append_row, append_event


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def make_id(prefix: str) -> str:
    return f"{prefix}_{int(datetime.now(timezone.utc).timestamp()*1000)}_{random.randint(1000,9999)}"


def main():
    p = argparse.ArgumentParser(description="Create LinkedIn/Facebook post + DM drafts")
    p.add_argument("--data-dir", required=True)
    p.add_argument("--platform", required=True, choices=["linkedin", "facebook"])
    p.add_argument("--kind", required=True, choices=["post", "dm"])
    p.add_argument("--lead-id", default="")
    p.add_argument("--to", default="", help="profile URL (recommended for DM)")
    p.add_argument("--campaign", default="re_engine_social")
    args = p.parse_args()

    approvals_path = os.path.join(args.data_dir, "approvals.csv")
    events_path = os.path.join(args.data_dir, "events.csv")
    ensure_csv(approvals_path, APPROVALS_HEADERS)
    ensure_csv(events_path, EVENTS_HEADERS)

    approval_id = make_id("soc")

    if args.kind == "post":
        text = (
            "Most agents don’t have a lead problem — they have a conversion and follow-up problem.\n\n"
            "We’re building a simple real estate engine:\n"
            "• consistent outbound\n"
            "• one inbox\n"
            "• approvals before sending\n"
            "• hot-lead routing\n\n"
            "Comment 'ENGINE' and I’ll send the 2-minute breakdown."
        )
        action_type = "post"
    else:
        text = (
            "Hey — quick question.\n\n"
            "If I sent you a 2‑minute breakdown of the outreach engine we’re running (and how profit-share works), would you want to see it?"
        )
        action_type = "dm"

    append_row(approvals_path, APPROVALS_HEADERS, {
        "approval_id": approval_id,
        "ts_created": now_iso(),
        "lead_id": args.lead_id,
        "channel": args.platform,
        "action_type": action_type,
        "draft_subject": "",
        "draft_text": text,
        "draft_to": args.to,
        "status": "pending",
        "approved_by": "",
        "approved_at": "",
        "notes": f"campaign={args.campaign}",
    })

    append_event(
        data_dir=args.data_dir,
        lead_id=args.lead_id,
        channel=args.platform,
        event_type="draft_created",
        campaign=args.campaign,
        meta={"approval_id": approval_id, "action_type": action_type, "to": args.to},
    )

    print(f"Created social draft: {approval_id}")


if __name__ == "__main__":
    main()
```

## B14) `mark_sent_manual.py`

Save as:
`<WORKSPACE>/realestate-engine/scripts/mark_sent_manual.py`

```python
#!/usr/bin/env python3
import argparse

from csv_utils import load_approvals, save_approvals, find_approval, now_iso, append_event


def main():
    p = argparse.ArgumentParser(description="Mark an approval as sent_manual")
    p.add_argument("--data-dir", required=True)
    p.add_argument("approval_id")
    p.add_argument("--by", default="web-dashboard")
    args = p.parse_args()

    approvals_path, rows = load_approvals(args.data_dir)
    idx, row = find_approval(rows, args.approval_id)

    row["status"] = "sent_manual"
    row["approved_by"] = args.by
    row["approved_at"] = now_iso()
    rows[idx] = row

    save_approvals(approvals_path, rows)

    append_event(
        data_dir=args.data_dir,
        lead_id=row.get("lead_id", "") or "",
        channel=row.get("channel", "") or "",
        event_type="sent_manual",
        meta={"approval_id": args.approval_id, "by": args.by},
    )

    print(f"Marked sent_manual: {args.approval_id}")


if __name__ == "__main__":
    main()
```
