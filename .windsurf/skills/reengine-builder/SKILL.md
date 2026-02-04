---
name: reengine-builder
description: Build the full RE Engine codebase from specs, including engine modules, tests, and scaffolding.
---

# RE Engine Builder

## When to use
Use this skill when you need to scaffold or implement new RE Engine modules.

## Related Skills and Rules
- **Global Rules:** Follow Rule 1 (Qwen coding), Rule 2 (repo conventions), Rule 3 (automation principles)
- **Complementary skills:** `@build-agentic-workflow`, `@mcp-implement-plan`, `@reengine-coding-agent`
- **Discovery:** Use `@mcp-repo-scan` to understand current codebase structure
- **Planning:** Use `@mcp-change-plan` for complex implementations

## Mandatory checks
- Never add secrets to repo (see security rules)
- Never implement auto-send without approvals (see approval-first-sending rule)
- Update docs in `docs/` when adding features (Rule 2 documentation requirements)
- Follow agent-friendly repo structure (Rule 2)
- Ensure automation principles for workflows (Rule 3)

## Procedure
1) Read `docs/DOC-MAP.md` and `REENGINE-PRODUCTION-SPEC.md`
2) Implement smallest vertical slice with tests
3) Run smoke test harness: `@run-tests-and-fix`
4) Update docs + changelog notes

## References
- `docs/dev-setup.md` - Development environment setup
- `docs/DOC-MAP.md` - Documentation map
- `REENGINE-PRODUCTION-SPEC.md` - Production specifications
- Global Rules 1, 2, 3 - Agent behavior guidelines
