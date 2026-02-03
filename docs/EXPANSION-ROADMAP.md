# Expansion Roadmap — RE Engine

This roadmap keeps expansion points explicit so future updates do not create confusion.

---

## Phase 0 (Now): Specs + scaffolding
- Docs complete
- Repo layout stable
- Safety invariants enforced

## Phase 1: Runnable local system
- Node/OpenClaw installed
- Engine builds + smoke tests pass
- CSV locks + robust CSV parsing

## Phase 2: MCP servers + orchestration
- reengine-core MCP implemented
- reengine-browser MCP implemented
- integrations MCP implemented

## Phase 3: Browser horde
- multi-worker orchestration
- job queue + dashboard
- handoff/resume pipeline

## Phase 4: Postgres migration
- Neon Postgres store
- migration tools + backfills

## Phase 5: Full auto capability toggles
- policy-driven automation levels
- per-channel risk policy

---

## Upgrade points (must be versioned)
- MCP tool schemas
- data model migrations
- adapter changes
- policy changes

