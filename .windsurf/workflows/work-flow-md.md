---
auto_execution_mode: 3
description: workflow-template
---

# Workflow Template

> **AI COMPLETION GUIDELINES** (for Cascade / Qwen / IDE agents)
> - Never leave sections blank. If a section is not applicable, write "Not applicable for this workflow" and briefly explain why.
> - If information is unknown, either:
>   - Ask the user for clarification, OR
>   - Write a clear TODO with what needs to be decided or discovered.
> - Always keep content concise and concrete; avoid generic filler.
> - When modifying an existing workflow, update this doc to reflect the current reality.
> - Copy this template to create new workflows: `docs/workflows/<workflow-name>.md`

## 0. Index Entry (for catalog)

Use this section so humans and agents can quickly catalog and scan workflows.

- **Workflow name:** `<WORKFLOW_NAME>`  
  > If modifying an existing workflow, keep the name stable unless we are explicitly renaming it.

- **Short description (1–2 sentences):**  
  What this workflow does in plain language.  
  > If the goal is still emerging, describe the current intent and mark TODOs.

- **Business domain / product:**  
  e.g., CreditX, CRM automations, internal ops, billing, etc.  
  > If unclear, propose a domain and ask the user to confirm.

- **Category:**  
  e.g., Ingestion, Sync, Scoring, Notifications, Approvals, Back-office, Reporting.  
  > Choose the closest category; if none fit, propose one and note that.

- **Status:**  
  e.g., Draft, In design, In development, In review, Live (dev), Live (staging), Live (prod), Deprecated.  
  > Always keep this accurate when the workflow changes.

- **Risk level:**  
  e.g., Low (informational), Medium (moderate side effects), High (financial/security/compliance impact).  
  > If uncertain, default to Medium and flag as TODO for human review.

- **Primary systems touched:**  
  e.g., `CRM`, `CreditX`, `Postgres`, `Stripe`, `Slack`, `Salesforce`.  
  > List at least one; if unknown, describe what is likely and confirm.

- **Primary owners (team / role):**  
  Who is responsible for this workflow operationally.  
  > If ownership is unclear, propose a role (e.g., "CreditX team") and mark TODO.

- **Related workflows:**  
  Links or names of other workflows this one depends on or interacts with.  
  > If none, explicitly write "None known" rather than leaving this blank.

---

## 1. Problem Statement

- **Business context:**  
  Describe the product or business area this workflow belongs to.  
  > If the product is ambiguous, reference `docs/overview.md` and propose the most likely area.

- **Problem:**  
  What exact problem is this automation solving?  
  > Avoid vague statements; if you can't state the problem crisply, ask for clarification.

- **Goal / success criteria:**  
  How will we know this workflow is successful (measurable outcomes)?  
  > If no metrics exist yet, propose at least 1–2 measurable criteria and mark them as suggestions.

---

## 2. High-Level Flow

### 2.1 Narrative

Describe the end-to-end flow in a few paragraphs:

- From trigger to completion.
- Who/what is involved (systems, users, agents).
- Key decision points.

> If you are modifying an existing flow, highlight what changed compared to prior behavior.

### 2.2 Steps & Actors (text diagram)

List the main steps as a sequence:

1. `<Actor>` receives `<event>` from `<Source>`.
2. `<Actor>` validates and enqueues a job to `<Queue>`.
3. `<Worker/Service>` processes the job and calls `<External System>`.
4. `<Worker/Service>` persists results to `<DB/Store>`.
5. `<Actor/UI>` notifies `<User/Team>`.

> Add more detail as needed, but keep it concise and readable.  
> If a step is synchronous end-to-end (no queue), say so explicitly.

---

## 3. Triggers and Inputs

### 3.1 Triggers

For each trigger:

- **Name:**  
- **Type:** (webhook, schedule, UI action, message bus event, etc.)
- **Source system:**  
- **Endpoint/schedule:** (e.g., `/api/v1/webhooks/crm-updated`, cron `0 * * * *`)

> If this workflow does not have external triggers (e.g., internal batch only), explicitly state that.

### 3.2 Input Payloads

For each trigger, define the payload shape:

- **Schema (fields & types):**
- **Required fields:**
- **Validation rules:**
- **Examples:**

> If an upstream payload is poorly documented, document what we actually rely on and mark gaps as TODO.

---

## 4. Actions and Outputs

### 4.1 Systems Touched

List each target system and what happens:

- **System:** (e.g., CreditX, CRM, billing, internal DB)
- **Action:** (create/update, calculation, lookup, etc.)
- **Data written/updated:**
- **Side effects:**

### 4.2 Final Outcome

Describe the workflow's end state:

- What is persisted where?
- What is visible to users?
- What downstream processes depend on this?

> If the outcome differs per branch (e.g., approved vs declined), describe the major branches.

---

## 5. Failure Modes and Error Handling

### 5.1 Failure Scenarios

Enumerate important failures:

- External service unavailable or slow.
- Invalid/partial payload.
- Conflicts (e.g., outdated version, duplicate request).
- Internal errors (exceptions, timeouts).

> If a failure is currently unhandled in code, call that out explicitly.

### 5.2 Handling Strategy

For each failure scenario:

- **Detection:**  
- **Response:** (retry, DLQ, manual intervention, user-facing error)
- **User/ops visibility:** (logs, alerts, dashboards, notifications)

> If no handling exists yet, propose a strategy aligned with global automation rules.

---

## 6. Idempotency Strategy

Describe how the workflow is safe to retry and handle duplicates:

- **Idempotency keys / deduplication:**  
  - Which key(s) uniquely identify a logical operation?
  - How are they stored or checked?

- **Safe operations:**  
  - Upserts / "create or update" semantics.
  - Checks before writes or side effects.

- **Edge cases:**  
  - What happens if the same event arrives multiple times?
  - What if a job retries after a partial success?

> If idempotency is not fully implemented yet, mark what is missing and how to add it.

---

## 7. Job and Queue Model

### 7.1 Jobs

For each job type:

- **Name:**  
- **Queue/topic:**  
- **Payload schema:**  
- **Max processing time:**  
- **Idempotency notes:**  

### 7.2 Retries and DLQs

- **Retry policy:**  
  - Max attempts.
  - Backoff strategy (e.g., exponential).
- **Dead-letter queue behavior:**  
  - When do items go to DLQ?
  - Who reviews and how?

> If there is currently no DLQ or retry strategy, explicitly state that and propose one.

---

## 8. Observability

### 8.1 Logging

- **What to log:**
  - Workflow start/finish.
  - Job start/retry/failure.
  - External calls (no secrets).

- **Log fields:**
  - Correlation ID.
  - Workflow name/version.
  - Key identifiers (user/account/workflow IDs where safe).

> If logging is minimal, describe the current state and propose improvements.

### 8.2 Metrics

If metrics infrastructure exists:

- **Counters/gauges:**
  - Total jobs processed.
  - Success vs failure.
  - DLQ size.

- **Latency metrics:**
  - Time from trigger to completion.

- **Dashboards / views:**
  - Where to see these metrics.

> If there is no metrics setup yet, explicitly say "No metrics yet" and propose what to track.

---

## 9. Human-in-the-Loop & Safety

- **Approval steps:**
  - Which actions require explicit human approval?
  - How is approval requested and recorded?

- **Risky operations:**
  - High-impact changes (financial, permissions, deletions).
  - Extra safeguards (double-confirmation, feature flags, dry-run mode).

- **Auditability:**
  - What is logged for audit (who/what/when)?
  - Where can an auditor or engineer trace a decision?

> If the workflow is currently fully automated but should have approval steps, call that out.

---

## 10. Interfaces and Data Contracts

List key APIs/events/contracts:

- **Internal APIs:**
  - Endpoints and request/response schemas.

- **Events:**
  - Names and payload shapes for events emitted.

- **External API contracts:**
  - Key endpoints used, fields we rely on.

Mention where corresponding types/models live in code (e.g., TS types, Pydantic models).

> If any contract is unstable or poorly documented, note risks and TODOs.

---

## 11. Implementation Notes

- **Code locations:**
  - Triggers: `src/api/...`
  - Jobs: `src/jobs/...`
  - Services/domain logic: `src/services/...` or `src/domain/...`
  - Integrations: `src/integrations/...`

- **Key patterns reused:**
  - Existing workflows referenced.
  - Design decisions that align with global rules.

> Keep this section updated when refactors change locations or patterns.

---

## 12. Testing Strategy

- **Test coverage:**
  - Which happy-path flows are tested?
  - Which failure modes are tested?
  - Idempotency tests?

- **Where tests live:**
  - `tests/integration/...`
  - `tests/e2e/...`

- **How to run:**
  - Command(s) (e.g., `make test`, `npm test`, `pytest`).

> If critical paths lack tests, list them and propose test additions.

---

## 13. Rollout and Operations

- **Environments:**
  - Dev, staging, prod behavior/flags.

- **Deployment:**
  - CI/CD pipeline or manual steps.
  - Feature flags or staged rollout.

- **Runbook references:**
  - Links/paths in `docs/OPERATIONS.md` or dedicated runbooks.
  - How to detect problems and respond.

> If no runbook exists, propose minimal runbook content and where it should live.
