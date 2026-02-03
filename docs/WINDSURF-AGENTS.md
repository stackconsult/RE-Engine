# Windsurf Cascade — AGENTS.md

Source: https://docs.windsurf.com/windsurf/cascade/agents-md

## Behavior
- Root `AGENTS.md` applies globally.
- Subdirectory `AGENTS.md` applies to that directory tree.
- Auto-discovered in workspace and (for git repos) up to git root.
- Case-insensitive: `AGENTS.md` or `agents.md`.

## Recommended RE Engine placement
- `/AGENTS.md` (global)
- `/engine/AGENTS.md` (engine module rules)
- `/playwright/AGENTS.md` (browser automation rules)
- `/docs/AGENTS.md` (documentation conventions)
