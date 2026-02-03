# AGENTS.md (Global) — RE Engine Production Rules

These instructions apply to the entire repository.

## Mission
Build and operate the **RE Engine** (Real Estate Outreach Engine) as a production system using:
- Node.js Runtime (core execution environment)
- Windsurf Cascade (coding agent + planning + skills + rules + AGENTS.md)
- MCP (tool servers)
- Playwright (human-browser automation)

## Absolute Safety Invariants (Never Break)
1. **Approval-first sending**: never send outbound unless an approval record is explicitly `status=approved`.
2. **No CAPTCHA/2FA bypass**: if a gate appears, pause and request human completion.
3. **No secrets in repo**: never commit API keys, passwords, tokens, cookies, session state.
4. **No auto-reply to unknown WA/TG**: unknown sender → contact capture approval only.
5. **Audit everything**: all meaningful actions must write an event record.

## Repo Structure (Target)
- `docs/` — specs, doc-map, runbooks
- `.windsurf/skills/` — Cascade skills (procedures)
- `.windsurf/rules/` — Cascade rules (policies)
- `engine/` — production engine (package)
- `services/` — long-running workers/daemons (optional)
- `playwright/` — browser agent harness + fixtures
- `tests/` — unit + integration + smoke
- `mcp/` — MCP servers for tool integration

## Engineering Rules
- Implement adapters for all side effects (email send, WA/TG send, browser actions).
- Tool outputs must be structured and deterministic.
- Prefer idempotent operations and explicit idempotency keys.
- Every script/worker must be safe to re-run.

## Testing / Quality Gate
Before any PR/merge:
- run unit tests
- run schema checks
- run smoke test (draft → approve → route using mocks)

## Documentation Rules
- Keep `REENGINE-PRODUCTION-SPEC.md` as the master index.
- Update doc-map when adding new systems.
- Document breaking schema changes explicitly.

---
# Agent Instructions

- This repository is the standalone RE Engine.
- All changes should follow production-first principles.
- All REengine-related commands are available through MCP servers and Windsurf skills.