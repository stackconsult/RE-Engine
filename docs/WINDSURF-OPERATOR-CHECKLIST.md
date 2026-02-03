# Windsurf Operator Checklist (RE Engine) — Grade Cascade Like a Production Engineer

This document is the **grading rubric + operational checklist** to ensure Windsurf Cascade produces production-ready outcomes for the RE Engine.

Use this while Cascade is coding. You (or a supervising agent) should continuously score the run and stop trajectories that violate safety or quality.

---

## 0) Stop-the-line rules (instant fail)
If any of these occur, stop the run immediately and correct:

1. **Auto-send without approval** (any channel).
2. **Secrets written to repo** (tokens, passwords, cookies, storageState, API keys).
3. **CAPTCHA/2FA bypass attempt** (should always hand off to human).
4. **Unbounded retries / infinite loops** (tool-call runaway).
5. **Large refactors without a plan** (architecture drift / merge pain).

---

## 1) Pre-flight (before Cascade edits anything)

### Checklist
- [ ] Cascade read `docs/DOC-MAP.md`.
- [ ] Cascade read `docs/AGENT-INSTRUCTIONS.md`.
- [ ] Cascade acknowledges **tool budgets**:
  - ≤ 20 tool calls per prompt
  - MCP ≤ 100 enabled tools
- [ ] Cascade proposes a plan with:
  - exact files to touch
  - smallest vertical slice
  - tests to add/update
  - rollback strategy

### Grade criteria
- A: plan is explicit, minimal, reversible
- C: plan is vague but recoverable
- F: no plan

---

## 2) Execution discipline (while coding)

### Scope control
- [ ] Each change is atomic (one purpose per commit).
- [ ] Cascade avoids cross-cutting formatting churn.
- [ ] Cascade does not edit generated files unless required.

### Safety enforcement
- [ ] Approval-only send is enforced in code paths.
- [ ] Unknown WA/TG sender never triggers auto-reply.
- [ ] DNC is enforced before drafts/sends.

### Tool-call discipline
- [ ] Cascade batches reads first.
- [ ] Cascade avoids repeated “continue” loops.
- [ ] Tool outputs are used deterministically (not ignored).

---

## 3) Production quality gates (must be true before declaring done)

### Code correctness
- [ ] Strong typing + explicit schemas (zod/typebox) for inputs/outputs.
- [ ] Side effects behind adapters.
- [ ] Idempotency keys for send operations.
- [ ] Concurrency controls (CSV locks, job overlap avoidance).

### Observability
- [ ] Structured logs (redacted) + correlation IDs.
- [ ] Events ledger written for every action.
- [ ] Browser artifacts on failure (trace/screenshot/video).

### Tests
- [ ] Unit tests for state machines and schema validation.
- [ ] Integration tests for router with mocked adapters.
- [ ] Smoke test passes.

---

## 4) Human handoff (optional but must exist)

### Required patterns
- [ ] Detect CAPTCHA/2FA/challenge pages.
- [ ] Pause with explicit operator instruction.
- [ ] Resume flow after human confirmation.

### Grade criteria
- A: clean state machine: `RUNNING → WAITING_FOR_HUMAN → RESUMED → COMPLETE`
- F: retries through challenge or bypass attempt

---

## 5) Specific grading for RE Engine subsystems

### A) CSV + data model
- [ ] Strict header validation
- [ ] Robust CSV parsing (quoted fields)
- [ ] Atomic writes + locks

### B) Approval workflow
- [ ] `pending → approved → sent|failed` enforced
- [ ] social: `approved_opened → sent_manual`

### C) MCP server quality
- [ ] Tools are small, composable, versioned
- [ ] Input schemas are strict
- [ ] Outputs are structured and minimal
- [ ] Server-side audit logs

### D) Playwright
- [ ] Stable locators (`getByRole`, testids)
- [ ] Traces on first retry
- [ ] Failure taxonomy + bounded retries

---

## 6) Scorecard (quick)

Score each area 0–2:
- Safety: __/2
- Scope discipline: __/2
- Reliability: __/2
- Observability: __/2
- Test coverage: __/2
- Docs updated: __/2

Total: __/12

Ship threshold: **≥ 10/12**

---

## 7) Common Cascade failure modes (what to watch)

- Implements features without updating docs/runbooks.
- Adds new schema fields without updating canonical schema docs.
- Builds a feature but forgets idempotency, causing duplicate sends.
- Overuses browser automation when an API integration is safer.
- Fails to add locking, leading to cron overlap and corrupted CSVs.

---
