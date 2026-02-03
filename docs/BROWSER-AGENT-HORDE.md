# Browser Agent Horde (Playwright) — Production Architecture

This document defines a **browser-agent horde** architecture: a scalable pool of Playwright workers orchestrated via MCP, with optional human handoff.

Goal: enable automation of human web tasks when desired, while maintaining:
- safety
- debuggability
- predictable throughput
- privacy/local-first processing

---

## 1) Key concepts

### 1.1 Browser Job
A job is a deterministic unit of work:
- open URL(s)
- authenticate (if needed)
- navigate a known flow
- extract structured data (no OCR where possible)
- optionally draft actions (never send without approval)

### 1.2 Worker
A worker is a Playwright process (or context) executing jobs.

### 1.3 Orchestrator
The orchestrator:
- queues jobs
- assigns to workers
- tracks state
- enforces concurrency caps
- triggers human handoff when gates appear

### 1.4 Human Handoff
When a gate appears:
- worker transitions to `WAITING_FOR_HUMAN`
- the system alerts the operator (OpenClaw/Telegram/WebChat)
- operator completes the gate
- worker resumes with updated storage state

---

## 2) State machine (non-negotiable)

Job states:
- `QUEUED`
- `DISPATCHED`
- `RUNNING`
- `WAITING_FOR_HUMAN`
- `RESUMED`
- `SUCCEEDED`
- `FAILED`
- `CANCELLED`

Each transition writes an event and emits metrics.

---

## 3) Scale model (predictable + measurable)

Inputs:
- `W` = number of workers
- `T` = average task duration
- `P` = probability of human handoff

Approx throughput:
- baseline throughput ≈ `W / T`
- with handoff, effective throughput reduces depending on operator latency

We must measure:
- queue depth
- p50/p95 job time
- handoff rate
- failure rate by category

---

## 4) MCP enablement

### 4.1 MCP server: `reengine-browser`
Expose tools:
- `browser.job.submit`
- `browser.job.status`
- `browser.job.cancel`
- `browser.job.resume`
- `browser.snapshot.extract_structured`

### 4.2 Schemas
All tools must:
- validate inputs
- return structured outputs
- include correlation IDs

---

## 5) Reliability & self-healing

### 5.1 Healing primitives
- dismiss cookie banners
- close modals
- detect navigation failures
- retry with alternate locators
- recover from stale elements

### 5.2 Bounded retries
- max retries per step
- exponential backoff
- classify errors:
  - auth expired
  - selector drift
  - network timeout
  - CAPTCHA/2FA

---

## 6) Privacy and security

- Use local-first storage by default.
- Never commit auth state.
- Redact secrets from logs.
- Optional: isolate workers via containers or separate OS users.

---

## 7) Model switch + control protocols (OpenClaw-style)

We maintain explicit control knobs:
- which model handles planning vs execution
- failover models for long context vs fast actions
- tool budgets (20 calls/prompt)

Mechanism:
- encode policies in `.windsurf/rules/` and `AGENTS.md`
- keep a runbook for switching models during incidents

---

## 8) UX expectations

Operator console should provide:
- live queue view (jobs + states)
- one-click handoff links (open the waiting page)
- artifact links (trace/screenshot)
- predictable retry behavior

---

## 9) Implementation plan

Phase 1:
- single-worker queue
- file-backed job store
- artifacts on failure

Phase 2:
- multi-worker pool
- remote MCP deployment
- richer dashboards

