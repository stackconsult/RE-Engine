# RE Engine — Production Spec (Standalone + MCP + Playwright)

This document is the **master production specification** for building and operating the RE Engine (Real Estate Outreach Engine) as a standalone system using:
- **Node.js Runtime** (core execution environment)
- **Windsurf Cascade** (coding agent + planning + skills + rules + AGENTS.md)
- **MCP** (Model Context Protocol) for tool/server extension
- **Playwright** as the **human-browser** automation substrate (self-healing, traceable)

> Source context:
> - `REengine-readme.md` = original Mac MVP save-point
> - `readme.md` = engineering build spec for a coding agent

---

## Why this filename
- **REENGINE**: matches the engine name used in the save-point.
- **PRODUCTION-SPEC**: clarifies this is the authoritative build/run contract (not a scratch README).
- **Standalone + MCP + Playwright**: makes the system scope explicit for future contributors.

---

## Document Map (what goes where next)

This file is the master index. As we continue research and design, we will create additional docs in this folder:

- `WINDSURF-MCP.md` — exact MCP configuration patterns (mcp_config.json), governance/whitelisting, and recommended RE Engine MCP servers.
- `WINDSURF-SKILLS.md` — how to package RE Engine procedures into `.windsurf/skills/*` (SKILL.md + resources).
- `WINDSURF-AGENTS.md` — how to structure directory-scoped AGENTS.md for this repo.
- `WINDSURF-RULES.md` — rules storage/activation modes and recommended policy rules.
- `PLAYWRIGHT-HUMAN-BROWSER-AGENT.md` — the production browser agent spec: persistent auth, traces, retries, self-healing.
- `REENGINE-ARCHITECTURE.md` — standalone system architecture and component integration.

---

## Status
Production-ready standalone system with full MCP integration and browser automation capabilities.
