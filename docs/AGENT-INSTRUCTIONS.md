# AGENT INSTRUCTIONS — RE Engine (Windsurf Cascade)

This is the **operational playbook** for Windsurf Cascade (and other coding agents) to work seamlessly across:
- RE Engine repo (this folder)
- the forked OpenClaw repo (for integrating RE Engine intent into OpenClaw)
- MCP servers (tooling surface)
- Playwright (human-browser automation)

It tells the agent **what to use when**: `AGENTS.md` vs Rules vs Skills vs Workflows vs MCP.

---

## 0) Golden Rules (Always)
1) Never send unless `approval.status == approved`.
2) Never bypass CAPTCHA/2FA.
3) Never commit secrets (tokens, cookies, creds, storageState).
4) Unknown WA/TG sender => contact capture approval (no auto-reply).
5) Write an event record for all meaningful actions.

---

## 1) Windsurf Cascade Limits (Plan for them)
- **Tool calling**: up to **20 tool calls per prompt**.
  - Strategy: batch reads first; do edits in a single cohesive patch; avoid infinite “continue” loops.
- **MCP tools**: Cascade can have up to **100 enabled tools** across MCP servers.
  - Strategy: keep RE Engine MCP server tools minimal and composable; avoid tool explosion.

References:
- Cascade overview: `docs/WINDSURF-CASCADE.md`
- MCP: `docs/WINDSURF-MCP.md`

---

## 2) What customization mechanism to use (Decision Tree)

### A) Use `AGENTS.md` when:
- you need **directory-scoped or global coding standards**
- you want constraints to apply automatically based on file location

Reference: `docs/WINDSURF-AGENTS.md`

### B) Use `.windsurf/rules/` when:
- you need **policy enforcement** (always-on or conditional)
- you want activation control (Always On / Glob / Model Decision / Manual)

Reference: `docs/WINDSURF-RULES.md`

### C) Use `.windsurf/skills/` when:
- the task is a **repeatable multi-step procedure** with supporting resources
- you want progressive disclosure + optional manual invocation with `@skill-name`

Reference: `docs/WINDSURF-SKILLS.md`

### D) Use `.windsurf/workflows/` when:
- you want a **repeatable trajectory** invoked via slash commands (operator runbooks)
- you want reproducible sequences (setup, release, deploy)

Reference (to research fully): Windsurf Workflows doc page.

### E) Use MCP when:
- Cascade needs a **reliable tool surface** for read/write actions
- actions must be auditable and schema-validated
- you want centralized governance (remote HTTP MCP in prod)

Reference: `docs/WINDSURF-MCP.md` + `docs/REENGINE-MCP-SERVERS.md`

---

## 3) Doc Map (Where to look first by task type)

### Build / architecture tasks
Focus:
- `REENGINE-PRODUCTION-SPEC.md`
- `docs/BUILD-PLAN.md`
- `docs/REENGINE-ARCHITECTURE.md`
- `docs/REENGINE-DATA-MODEL.md`

Skill:
- `@reengine-builder`

### MCP setup / tool servers
Focus:
- `docs/WINDSURF-MCP.md`
- `docs/REENGINE-MCP-SERVERS.md`

Skill:
- `@reengine-mcp-setup`

### Browser automation (human-browser)
Focus:
- `docs/PLAYWRIGHT-HUMAN-BROWSER-AGENT.md`

Skill:
- `@reengine-playwright-agent`

### Operations / approvals / sending
Focus:
- `docs/REENGINE-WORKFLOWS.md`
- `docs/RUNBOOKS.md`

Skill:
- `@reengine-operator`

### Reliability / self-healing
Focus:
- `docs/BUILD-PLAN.md`
- `docs/BUILD-PLAN-NEXT-STEPS.md`

Skill:
- `@reengine-self-healing`

### Repo management (branches/PRs/releases)
Focus:
- `AGENTS.md`

Skill:
- `@reengine-release-and-pr`

---

## 4) Working on the forked OpenClaw repo (integration rules)

Goal: integrate RE Engine intent into OpenClaw cleanly without fighting upstream.

### Strategy
- Prefer **additive integration**:
  - add new skill(s) under OpenClaw `skills/` (if aligning with OpenClaw’s skill system)
  - keep RE Engine as a separate module/package invoked by OpenClaw tools/cron
- Avoid invasive edits to OpenClaw core unless necessary.

### Isolation
- If multiple Cascades will work on OpenClaw, use **worktrees** to prevent edit races.
  - Reference: `docs/WINDSURF-CASCADE.md` (worktrees note)

### Prompting style for OpenClaw edits
- Always start with: "Locate the relevant OpenClaw files and confirm the current behavior before changes."
- Require a plan with explicit file paths and small commits.

---

## 5) “Focus Links” (Windsurf official docs)

These are the highest leverage pages for building production systems with Cascade:
- MCP: https://docs.windsurf.com/windsurf/cascade/mcp
- AGENTS.md: https://docs.windsurf.com/windsurf/cascade/agents-md
- Skills: https://docs.windsurf.com/windsurf/cascade/skills
- Memories & Rules: https://docs.windsurf.com/windsurf/cascade/memories
- Cascade overview: https://docs.windsurf.com/windsurf/cascade/cascade

---

## 6) Mandatory completion definition for any implementation task
A task is not “done” unless it includes:
- updated docs (if behavior changed)
- tests (unit/integration/smoke where relevant)
- a safe failure mode (no auto-send)
- clear run command(s)
