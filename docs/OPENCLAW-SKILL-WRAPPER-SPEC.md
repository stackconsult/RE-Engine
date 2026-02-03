# OpenClaw Skill Wrapper Spec — RealEstate Outreach Engine

This document defines the **OpenClaw-side skill wrapper** that makes the RE Engine feel native inside OpenClaw WebChat/Dashboard.

Goal: a user can operate the engine entirely from OpenClaw WebChat:
- list approvals
- approve/reject/edit
- run router
- run ingest jobs
- open social pages for semi-auto actions

This is designed to be added to your **forked OpenClaw repo** under `skills/realestate-outreach-engine/`.

---

## 1) Design principles
- Wrapper skill is **thin**: it calls RE Engine primitives (prefer MCP tools; fallback to local CLI).
- No business logic inside OpenClaw skill.
- Strict safety:
  - never send unless approved
  - never store secrets in repo

---

## 2) Command surface (WebChat)

### 2.1 Operator commands
- `/re_show_approvals [status=pending] [limit=50]`
- `/re_approve <approval_id>`
- `/re_reject <approval_id> [reason]`
- `/re_edit <approval_id> [to=...] [subject=...] [text=...]`
- `/re_run_router [max=20]`

### 2.2 Ingest commands
- `/re_run_imap [max=25]`
- `/re_run_hot_scan [minutes=60] [max_hot=25]`
- `/re_run_social_ingest <platform> [hot-only|always|off]`

### 2.3 Social completion
- `/re_mark_sent_manual <approval_id>`

---

## 3) Implementation options

### Option A (preferred): Call MCP tools
- OpenClaw skill uses MCP servers configured in Windsurf (or on the gateway host) to call:
  - approvals.list/approve/reject/edit
  - router.processApproved
  - ingest.imap
  - ingest.hot_scan

Advantages:
- typed schemas
- auditability
- remote prod governance

### Option B: Call local CLI entrypoints
- OpenClaw skill shells out to `node` entrypoints (or python scripts) stored under workspace.

Advantages:
- simpler when MCP is not ready

Tradeoffs:
- harder to govern in prod

---

## 4) Required configuration inputs

### Workspace path
The wrapper must resolve `<WORKSPACE>` via `openclaw directory` (never hardcode).

### Data dir
Standard:
- `<WORKSPACE>/realestate-engine/data`

### Env vars
- `RE_TELEGRAM_ALERT_TARGET`
- `RE_CONTACT_CAPTURE_ALERTS`
- `SPACEMAIL_*` (if using SpaceEmail)

---

## 5) Files to add in OpenClaw fork

```
openclaw-fork/
  skills/
    realestate-outreach-engine/
      SKILL.md
      commands.md
      templates/
      runbooks/
```

---

## 6) Done criteria
- All commands work from WebChat.
- No send occurs without approval.
- Router + ingest are idempotent and logged.
- Social items open pages and require manual confirmation.

