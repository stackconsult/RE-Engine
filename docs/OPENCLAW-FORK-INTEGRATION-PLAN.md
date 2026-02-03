# OpenClaw Fork Integration Plan — Make RE Engine Native (Without Upstream Pain)

This plan describes **exactly** how we integrate the RE Engine into your forked OpenClaw repo so it behaves as a first-class capability while keeping merges manageable.

Guiding principle: **additive integration** over invasive core edits.

---

## 0) Goals
- RE Engine runs as a production workflow using OpenClaw:
  - channels (WhatsApp/Telegram)
  - cron
  - browser tool/profile
  - WebChat approvals
- Windsurf Cascade can update both repos safely.
- Full automation is possible, but human handoff remains available.

---

## 1) Integration architecture (recommended)

### Option A (recommended): RE Engine external package + OpenClaw skill wrappers
- Keep RE Engine code here (this repo).
- Expose RE Engine via:
  - MCP servers (preferred) and/or
  - a CLI (node entrypoint)
- In the OpenClaw fork:
  - create a workspace skill that calls the MCP tools
  - create cron jobs that invoke those tools

Pros:
- Minimal OpenClaw diff; easy to rebase upstream.
- Clear tool boundaries and audit logs.

Cons:
- Requires MCP setup on the operator machine.

### Option B: Vendor RE Engine scripts inside OpenClaw workspace
- Place RE engine scripts under the OpenClaw workspace directory.

Pros:
- Simple operationally.

Cons:
- Harder to version; drift across machines.

---

## 2) Concrete file changes in the OpenClaw fork

### 2.1 Add a dedicated OpenClaw skill
Create in OpenClaw repo (fork):

- `skills/realestate-outreach-engine/SKILL.md`

Skill contents:
- describes the approval-first model
- points to MCP tools and/or local CLI entrypoints
- includes operator commands:
  - show approvals
  - approve
  - run router
  - run ingest

### 2.2 Add an AGENTS.md for OpenClaw repo (directory-scoped)
Add to OpenClaw fork root:
- `AGENTS.md`

And optionally:
- `skills/AGENTS.md`

Instructions:
- prefer additive changes
- do not break upstream conventions
- require tests for changes

### 2.3 Add a thin integration layer (if needed)
If OpenClaw needs a native command surface:
- add a new command under `src/commands/` (only if strictly required)
- otherwise keep integration as skills + MCP

---

## 3) How approvals should feel “native” in OpenClaw

### Target UX
- WebChat: `/show_approvals`, `/approve <id>`, `/reject <id>`, `/edit <id> ...`

Implementation choices:
- Implement these as OpenClaw **skills** (preferred).
- Or as OpenClaw **commands** (only if skill routing is insufficient).

---

## 4) Cron orchestration in OpenClaw

We keep cron definitions identical to `REengine-readme.md`.

We should ship:
- a script that prints the exact `openclaw cron add ...` commands with substituted variables
- an idempotent installer (won’t duplicate jobs)

---

## 5) Data + storage ownership

### Phase 1 (CSV)
Owned by RE Engine, stored under OpenClaw workspace:
- `<WORKSPACE>/realestate-engine/data/*.csv`

### Phase 2 (Neon)
- Move storage to Postgres
- Keep CSV as export/debug view

---

## 6) Production readiness checklist for the OpenClaw fork

- [ ] OpenClaw runs with safe DM policy (pairing + allowlists)
- [ ] Cron overlap protection is implemented
- [ ] Browser profile `openclaw` is configured and logged in
- [ ] Skills are installed and visible (`openclaw skills list`)
- [ ] MCP servers are installed and reachable (if using MCP)
- [ ] Secrets are injected via env vars only

---

## 7) How we make it “ours”

Definition:
- Your forked OpenClaw repo gains:
  - a first-class RE Engine skill
  - optional command surface (only if needed)
  - docs/runbook pointers
  - safe cron presets
  - guardrails (AGENTS.md)

But we avoid:
- rewriting OpenClaw core architecture
- coupling RE Engine deeply into OpenClaw internals

---

## 8) Next implementation steps

1) Decide integration mode: Option A (MCP) vs Option B (vendored scripts)
2) Implement MCP servers in this repo
3) Implement OpenClaw skill wrappers in the fork
4) Run end-to-end: draft → approve → route → ingest replies

