# RE Engine ↔ OpenClaw Integration (Production)

This is the **keystone integration document**: how RE Engine runs *on top of* OpenClaw with production safety.

OpenClaw provides the runtime control plane:
- channels (WhatsApp, Telegram, WebChat)
- cron scheduler
- browser profile tool
- dashboard/WebChat UI
- session routing and multi-agent isolation

RE Engine provides the business system:
- data model (leads/approvals/events/contacts/dnc)
- approval-first outbound
- inbound ingest + hot routing
- audit trail and reliability constraints

---

## 1) Execution model

### 1.1 Approval-first lifecycle
1) Draft generation writes `approvals.csv` rows with `status=pending`.
2) Human approves via WebChat/dashboard (or via dedicated commands).
3) Router processes only `status=approved`.
4) Router updates status to `sent|failed|approved_opened|sent_manual`.
5) Every step appends an `events.csv` row.

Hard invariant: **no `approved` → no send**.

---

## 2) Data location in the OpenClaw workspace

Do not guess workspace paths.

- Resolve with:
  - `openclaw directory`

Standard paths:
- `<WORKSPACE>/realestate-engine/data/` (CSV store)
- `<WORKSPACE>/realestate-engine/scripts/` (legacy python scripts)

Future (recommended):
- `<WORKSPACE>/realestate-engine/bin/` (node entrypoints)
- Postgres in Neon for phase 2

---

## 3) Channels configuration (safety baseline)

### 3.1 WhatsApp
- `dmPolicy = pairing`
- allowlist owner(s)
- require explicit pairing approval:
  - `openclaw pairing approve whatsapp <code>`

### 3.2 Telegram
- bot token stored via env/config
- `dmPolicy = pairing`
- alerts delivered to a single DM chat id

---

## 4) Cron jobs

OpenClaw cron is the scheduler.

We provide an installer:
- `scripts/ops/openclaw_cron_install.sh`

Properties:
- resolves workspace via `openclaw directory`
- idempotent by name
- supports `DRY_RUN=1`
- uses `RE_TZ` (defaults to America/Edmonton)

---

## 5) Browser tool usage (LinkedIn/Facebook semi-auto)

Rules:
- The system opens the correct page.
- Human clicks Send/Post.
- The system records completion via `sent_manual`.

Rationale:
- social sites are fragile and gate often (2FA/CAPTCHA)
- this preserves reliability + compliance

---

## 6) “Native” WebChat commands (recommended)

Target operator commands:
- show approvals
- approve/reject/edit
- run router
- run ingest
- mark sent_manual

Implementation:
- OpenClaw fork skill wrapper under `skills/realestate-outreach-engine/`
- see `docs/OPENCLAW-SKILL-WRAPPER-SPEC.md`

---

## 7) Migration plan: Python scripts → TS/MCP

The MVP scripts in `REengine-readme.md` are Python-first.

Production recommendation:
- keep Python scripts as reference
- move core logic into TS engine + MCP tools
- OpenClaw should call MCP tools for all critical actions

---

## 8) Failure handling

- Any auth gate: stop and request human completion
- Any send failure: mark approval failed + log event
- Any ingest failure: log event + notify Telegram
- Any concurrency overlap risk: enforce lock (phase 1 CSV) or DB transactions (phase 2)

---

## 9) Operational verification checklist

- `openclaw doctor` passes
- channels status good
- cron jobs installed (no duplicates)
- approvals can be shown/approved
- router processes approved only
- social open works and manual completion recorded

