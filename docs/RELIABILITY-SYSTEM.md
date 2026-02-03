# Reliability System — Prevent, Detect, Recover (Production)

This doc defines the reliability fabric to prevent the system from failing, hanging, falsifying, or bottlenecking.

---

## 1) Failure taxonomy (must be explicit)

### Data layer
- CSV corruption
- schema drift
- concurrency overwrite

### Messaging
- send failure
- rate limit
- auth expired

### Browser
- selector drift
- navigation timeout
- CAPTCHA/2FA gate
- blocked account

### Tooling
- MCP server down
- tool schema mismatch
- tool budget exceeded

---

## 2) Prevent

- strict schemas at every boundary
- idempotency keys for sends
- locks for CSV operations
- bounded retries
- tool budget enforcement

---

## 3) Detect

- structured logs (redacted)
- events ledger is source of truth
- Playwright artifacts
- health checks

---

## 4) Recover

- automated retry where safe
- human handoff for gates
- rollback for releases
- fail-closed policies (no send)

---

## 5) Predict

Measure and forecast:
- queue depth
- p95 job latency
- handoff rate
- send success rate

Use these to:
- scale workers
- tune schedules
- tune policies

---

## 6) Expansion points (keep system evolvable)

- MCP server versioning
- adapter interfaces
- migration CSV → Postgres
- plugin skills

