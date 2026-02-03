# RE Engine — Production Build Plan (Full Completion)

This document defines the **full, production-grade implementation** for the RE Engine and its orchestration across:
- Windsurf Cascade (skills/rules/AGENTS)
- MCP servers (tool surfaces)
- Playwright browser agent (human-browser + self-healing)
- OpenClaw runtime integration (channels, cron, approvals)

It is written as an engineering plan a senior full-stack architect would ship.

---

## 1) Deliverables (Production-Complete)

### 1.1 Repository deliverables
- Full engine codebase with typed APIs, adapters, and test coverage
- Full Playwright automation harness with artifacts and recovery
- One or more MCP servers exposing safe operations
- Full documentation set (design, runbooks, security, ops)
- CI-like local quality gate scripts

### 1.2 Operational deliverables
- Safe-by-default send policies (approval-first)
- Idempotent job processing
- Observability: structured logs + event ledger
- Failure recovery playbooks and automated remediation hooks

---

## 2) Target Directory Layout

```
BrowserOs/
  AGENTS.md
  REENGINE-PRODUCTION-SPEC.md
  readme.md
  REengine-readme.md

  docs/
    DOC-MAP.md
    BUILD-PLAN.md
    REENGINE-ARCHITECTURE.md
    REENGINE-DATA-MODEL.md
    REENGINE-WORKFLOWS.md
    REENGINE-MCP-SERVERS.md
    PLAYWRIGHT-HUMAN-BROWSER-AGENT.md
    RUNBOOKS.md
    WINDSURF-AGENTS.md
    WINDSURF-CASCADE.md
    WINDSURF-MCP.md
    WINDSURF-MEMORIES.md
    WINDSURF-RULES.md
    WINDSURF-SKILLS.md

  engine/
    src/
      index.ts
      config/
      domain/
      store/
      approvals/
      router/
      ingest/
      classify/
      policy/
      ops/
      observability/
      util/
    test/
    package.json
    tsconfig.json

  mcp/
    reengine-core/
    reengine-browser/
    reengine-integrations/

  playwright/
    src/
      runner.ts
      auth/
      locators/
      flows/
      heal/
      artifacts/
      net/
    test/
    playwright.config.ts

  scripts/
    dev/
    ops/

  .windsurf/
    skills/
    rules/
```

---

## 3) Architecture Principles (Non-Negotiable)

### 3.1 Safety invariants
- **Never send** unless approval status is exactly `approved`.
- **Never bypass CAPTCHA/2FA**.
- **Never store secrets in repo**.
- **Never auto-reply to unknown WA/TG senders**.

### 3.2 Separation of concerns
- Domain logic must be pure and testable.
- Side effects must be behind adapter interfaces.
- Storage must be behind repositories.
- All long-running jobs must be idempotent.

### 3.3 Tool boundaries
- MCP exposes “safe primitives” with explicit schemas.
- Playwright is invoked via a controlled job runner.
- OpenClaw is the delivery runtime (channels/cron/UI) but RE Engine owns the business logic.

---

## 4) Engine Implementation (Full)

### 4.1 Core types
- `Lead`, `Approval`, `Event`, `Contact`, `DncEntry`
- Strongly typed enums for status + channels + action types.

### 4.2 Storage layer
Implement a common interface with two backends:
- CSVStore (phase 1)
- PostgresStore (phase 2)

Requirements:
- Strict schema validation on load
- Atomic writes for CSV
- Locking to prevent concurrent write corruption

### 4.3 Approval Service
Responsibilities:
- create draft approvals
- list/filter approvals
- approve/reject/edit with audit events

### 4.4 Router Service
Responsibilities:
- process only `status=approved`
- dispatch to channel adapters
- update approval status to `sent|failed|approved_opened`
- event logging

### 4.5 Ingest Services
- IMAP ingestion → lead mapping → classification → draft reply approvals
- WA/TG session ingestion → contact mapping → hot detection → drafts or contact capture
- Social snapshot ingestion (browser snapshot-first) → inbox + hot draft

### 4.6 Policy Service
Centralize rules:
- send windows
- daily caps
- DNC enforcement
- allowlists
- escalation thresholds

---

## 5) MCP Servers (Full)

### 5.1 `reengine-core` MCP
Expose:
- approvals.list/approve/reject/edit
- leads.import/validate
- events.query
- policy.get/set (safe subset)

### 5.2 `reengine-browser` MCP
Expose:
- browser.job.submit
- browser.job.status
- browser.snapshot.extract

### 5.3 `reengine-integrations` MCP
Expose:
- github.open_pr
- github.comment
- postgres.readonly_query

All MCP tools must:
- validate inputs strictly
- redact secrets
- return structured outputs
- include correlation IDs

---

## 6) Playwright Human-Browser Agent (Full)

### 6.1 Runtime
- Node-based Playwright runner
- storageState strategy (no repo storage)

### 6.2 Self-healing layer
- popup/cookie banner dismissal
- alternate locator strategies
- bounded retries with classified errors

### 6.3 Artifacts
- traces on failure/first retry
- screenshots
- network logs

### 6.4 Human-in-the-loop
- detect challenge pages
- pause and request operator action
- continue after confirmation

---

## 7) CI-like Local Quality Gates

Provide scripts:
- lint
- typecheck
- unit tests
- integration tests
- smoke tests

---

## 8) Completion Definition

The system is “complete” when:
- all workflows run end-to-end in dry-run + mocked send
- production send is gated behind approvals
- MCP tools are stable and versioned
- Playwright harness produces artifacts and heals common failures
- docs and runbooks are sufficient for on-call operation
