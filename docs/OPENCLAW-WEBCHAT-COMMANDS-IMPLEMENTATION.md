# OpenClaw WebChat Commands — Implementation Plan (/re_*)

This document specifies how to implement RE Engine operator commands in your **forked OpenClaw** so the engine is controllable from WebChat.

Target: commands like `/re_show_approvals`, `/re_approve <id>`, `/re_run_router`.

---

## 1) Design goals
- Commands must be **safe-by-default**.
- No sends occur unless approvals are `approved`.
- Commands should return **concise, operator-friendly** output.
- Commands should be idempotent when possible.

---

## 2) Implementation approaches

### Approach A (preferred): Skill-driven commands that call MCP
Implement a skill under OpenClaw:
- `skills/realestate-outreach-engine/SKILL.md`

The skill provides instructions and may include small helper scripts. The actual operations happen via MCP tools:
- `reengine-core.approvals.list`
- `reengine-core.approvals.approve`
- `reengine-core.router.processApproved`

**Why:** keeps OpenClaw fork diffs minimal; easy upstream rebase.

### Approach B: Native OpenClaw command surface
If OpenClaw requires true slash-command support beyond skill text routing, implement:
- a command module under OpenClaw `src/commands/` that registers `/re_*`

Only do this if skill text routing cannot reliably dispatch.

---

## 3) Command specs (inputs/outputs)

### `/re_show_approvals [status=pending] [limit=50]`
- Valid statuses: pending/approved/rejected/sent/failed/approved_opened/sent_manual
- Output: one line per approval (id, channel, action, lead_id, to, short preview)

### `/re_approve <approval_id>`
- Output: confirmation + next recommended command

### `/re_reject <approval_id> [reason]`
- Output: confirmation

### `/re_edit <approval_id> [to=...] [subject=...] [text=...]`
- Output: confirmation; resets status to pending

### `/re_run_router [max=20]`
- Output: processed/sent/failed/opened counts

### `/re_run_imap [max=25]`
- Output: processed count + hot drafts created

### `/re_run_hot_scan [minutes=60] [max_hot=25]`
- Output: drafted + contact captures

### `/re_run_social_ingest <linkedin|facebook> [hot-only|always|off]`
- Output: hot drafts created + whether alerts fired

### `/re_mark_sent_manual <approval_id>`
- Output: confirmation

---

## 4) Workspace discovery
All commands must resolve workspace dynamically:
- `openclaw directory`

Then use:
- `<WORKSPACE>/realestate-engine/data`

Never hardcode paths.

---

## 5) Operator UX
- Commands must be short.
- For long lists, show first N and include "...".
- Include next-step guidance in responses.

---

## 6) Security
- No secrets in outputs.
- Redact tokens.
- No uncontrolled file read.

