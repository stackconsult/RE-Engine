---
name: reengine-self-healing
description: Add reliability mechanisms: retries, lockfiles, idempotency keys, diagnostics, and automated recovery steps.
---

# Self-Healing

## Required mechanisms
- lock to prevent overlapping cron runs
- bounded retries with backoff
- artifact capture (logs, traces)
- classify failures (auth expired vs selector drift vs network)

## Outputs
- a recovery playbook
- automated remediation scripts (safe, no auto-send)
