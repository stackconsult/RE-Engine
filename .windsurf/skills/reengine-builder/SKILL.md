---
name: reengine-builder
description: Build the full RE Engine codebase from specs, including engine modules, tests, and scaffolding.
---

# RE Engine Builder

## When to use
Use this skill when you need to scaffold or implement new RE Engine modules.

## Mandatory checks
- Never add secrets to repo.
- Never implement auto-send without approvals.
- Update docs in `docs/` when adding features.

## Procedure
1) Read `docs/DOC-MAP.md` and `REENGINE-PRODUCTION-SPEC.md`
2) Implement smallest vertical slice with tests
3) Run smoke test harness
4) Update docs + changelog notes
