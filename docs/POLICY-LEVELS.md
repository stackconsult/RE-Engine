# Policy Levels — Manual → Assisted → Fully Auto (Production)

This document defines **automation policy levels** for the RE Engine. It ensures the system can be fully automatic *if the user chooses*, while keeping a clean, auditable safety model.

The goal is to avoid “code forks” for different automation modes. Instead:
- policy drives behavior
- every action is logged
- high-risk actions require approvals unless explicitly configured

---

## 0) Core principle
**Policy changes behavior; architecture stays stable.**

All modes share:
- same data model
- same adapters
- same event ledger
- same failure taxonomy

---

## 1) Automation levels

### Level 0 — Manual
- System may draft suggestions.
- Human executes actions.

Allowed:
- generate drafts into approvals
- open pages
- provide checklists

Not allowed:
- any send

### Level 1 — Assisted (default recommended)
- System drafts and prepares actions.
- Human approves sends.
- System executes sends only after approval.

Allowed:
- create approvals (pending)
- send approved items
- run ingest
- open social pages for manual send

### Level 2 — Guarded Auto
- System can auto-send for **low-risk** channels/actions.
- Human approval remains for high-risk actions.

Allowed examples (configurable):
- auto-send follow-ups to known warm leads
- auto-reply templated responses to known contacts

Still requires approval:
- first-touch outbound
- unknown contacts
- any action that could violate compliance or user trust

### Level 3 — Fully Auto
- System can send without human approval.
- Still fails closed on uncertainty.

Hard constraints still apply:
- no CAPTCHA/2FA bypass
- strict DNC enforcement
- strong idempotency
- audit logging

---

## 2) Policy axes (orthogonal controls)

### 2.1 Approval requirement
- `approvalRequired: true|false`

### 2.2 Channel enablement
- per-channel enablement flags

### 2.3 Risk tier mapping
Each action is assigned a risk tier:
- `LOW`: safe automation (e.g., internal logs, non-sends)
- `MEDIUM`: likely safe but still user-facing
- `HIGH`: high blast radius (first-touch, social posting, account-risk actions)

Policy can require approvals for MEDIUM/HIGH.

### 2.4 Handoff requirement
- `handoffRequiredOnChallenge: true` (always true)

### 2.5 Send windows / caps
- daily cap
- time window by timezone

---

## 3) Recommended defaults (production)

### Default stance
- Start at **Level 1 (Assisted)**
- Allow Level 2 only after metrics show stability
- Level 3 only for power users with explicit opt-in

Suggested baseline:
- approvalRequired = true
- autoSendFirstTouch = false
- autoReplyUnknownSenders = false

---

## 4) Channel-by-channel policy table

| Channel | Default mode | High-risk examples (approval required) | Low-risk examples (auto ok) |
|---|---|---|---|
| Email | Assisted | first-touch outreach, pricing claims | internal notifications, known follow-up templates |
| WhatsApp | Assisted | first-touch outreach, unknown inbound replies | alerts to owner, replies to known contacts (Level 2+) |
| Telegram | Assisted | outbound to new IDs | operational alerts |
| LinkedIn | Manual/Semi-auto | posting, DMs | opening pages for operator |
| Facebook | Manual/Semi-auto | posting, DMs | opening pages for operator |

---

## 5) Implementation requirements (engineering)

### 5.1 Policy must be evaluated server-side
Do not rely on UI-only checks.

### 5.2 Policy changes must be auditable
Every policy change must emit:
- event type: `policy_changed`
- who changed it
- diff (old vs new)

### 5.3 Fail-closed defaults
If policy is missing/invalid:
- behave as **Assisted**

---

## 6) UX expectations

Operator UI (OpenClaw WebChat/Dashboard or future UI) must show:
- current policy level
- what is automated vs approval-gated
- last policy change

---

## 7) Metrics gates for moving up levels

Before allowing Level 2:
- send_success_rate stable above targets (see `docs/SLO-SLI-ALERTING.md`)
- unauthorized_send_count == 0
- low handoff rate and stable p95

Before allowing Level 3:
- same as above + an explicit operator acknowledgment step

---
