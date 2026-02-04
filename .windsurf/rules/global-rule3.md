---
trigger: model_decision
---

# Global Automation & Agentic Workflow Rules

## Context

- Our products are B2B automation and agentic systems (MCP-based tools, internal agents, workflows).
- This rule defines domain-specific expectations:
  - Idempotency
  - Queues and reliability
  - Observability
  - Human-in-the-loop and safety
- Qwen3‑Coder‑Next (via Ollama), Cascade, and other agents MUST design and implement workflows according to these principles.

## 1. Core automation architecture

For any new automation or workflow:

- **Separate concerns:**
  - Triggers: Webhooks, schedulers, message bus listeners, UI actions.
  - Business logic: Pure or mostly pure code implementing the domain behavior.
  - Persistence: Repositories/DAOs handling DB/queue/cache interactions.
- **Idempotency:**
  - Handlers for triggers (especially webhooks and jobs) MUST be idempotent where practical.
  - Use idempotency keys, deduplication tables, or safe upserts as needed.
- **Durability:**
  - Long-running or retryable work MUST go through a queue (e.g., Redis/BullMQ, SQS, etc.).
  - Do not block HTTP requests on long-running external calls; offload to jobs.

## 2. Job and queue semantics

For any queue-based job or worker:

- **Job structure:**
  - Each job type has:
    - A clear name and payload schema.
    - Validation of payloads at the boundary.
    - Written expectations for retry behavior and failure handling.
- **Retries:**
  - Prefer bounded retries with backoff (e.g., exponential).
  - Use dead-letter queues (DLQs) or equivalent for repeated failures.
  - Never infinite-loop jobs; always have a final failure path.
- **Idempotency & concurrency:**
  - Design jobs so they can be safely retried (e.g., by checking current state before acting).
  - Use locks or coordination where strict single-processing is required.

## 3. External integration rules

When automations interact with external systems (CRMs, billing, credit bureaus, etc.):

- **Isolation:**
  - All external calls go through dedicated integration modules/services.
  - Do not call external APIs directly from UI components or deep inside business logic.
- **Safety:**
  - Never embed secrets or tokens in code; always use environment variables or secret stores.
  - Log external calls with non-sensitive metadata (e.g., correlation IDs, request IDs).
  - Mask or omit sensitive data in logs.
- **Reliability:**
  - Implement timeouts and retries with sane defaults.
  - Treat external errors as first-class: handle them explicitly and surface them clearly.

## 4. Observability and operations

Every production automation must be observable:

- **Logging:**
  - Use structured logging (JSON or key-value) for important events:
    - Job start/finish
    - External calls (without leaking secrets)
    - Errors and warnings
  - Include correlation IDs across requests, jobs, and external calls.
- **Metrics:**
  - Track key metrics where possible:
    - Job throughput and failure rates.
    - Latency for critical flows.
    - External error rates.
- **Alerts and runbooks:**
  - For critical automations:
    - Define alert conditions (e.g., sustained failure rate above threshold).
    - Document remediation steps in `docs/OPERATIONS.md` and/or dedicated runbooks.
  - Agents may propose runbooks, but humans approve and refine them.

## 5. Human-in-the-loop & safety constraints

- **Human checkpoints:**
  - For high-risk actions (e.g., financial decisions, irreversible changes), agents MUST:
    - Propose actions and wait for human approval before execution.
    - Provide clear, concise summaries of what will happen and why.
- **Auditability:**
  - All automated changes to external systems should be traceable:
    - Include who/what initiated the change (agent, user, workflow name).
    - Record key inputs and outputs where allowed by compliance/privacy constraints.
- **Guardrails:**
  - Agents must not:
    - Perform destructive operations (e.g., bulk deletes) without explicit confirmation and safeguards.
    - Change security or permission settings without clearly flagged reasoning and approval.

## 6. How agents (including Qwen) should implement automations

When designing or modifying automations, agents MUST:

- Follow Rule 1 for Qwen-driven coding loops and Rule 2 for repo structure.
- For each new workflow:
  - Document the workflow in `docs/workflows/<name>.md` including:
    - Triggers, actions, external systems, and failure modes.
    - Whether it is fully automated or has human-in-the-loop steps.
  - Provide tests that simulate end-to-end behavior where feasible.
- Use a dedicated skill or workflow (e.g., `build-agentic-workflow`) that:
  - Designs the workflow from a product requirement.
  - Implements triggers, jobs, orchestration, and observability hooks.
  - Ensures idempotency and safe retry behavior are included in the design.

## Summary

- This rule encodes how we design B2B automations and agentic systems:
  - Idempotent, queue-backed, observable, safe, and auditable.
- Agents, including Qwen3‑Coder‑Next via Ollama, must build and evolve systems according to these principles, unless a project-specific rule explicitly overrides them.

