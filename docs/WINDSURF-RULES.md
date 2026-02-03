# Windsurf Cascade — Memories & Rules

Source: https://docs.windsurf.com/windsurf/cascade/memories

## Rules locations
- Global: `global_rules.md`
- Workspace: `.windsurf/rules/` (directory of rule files)

## Discovery
- discovers `.windsurf/rules` in workspace + subdirectories
- for git repos, searches parent directories up to git root

## Activation modes
- Manual (@mention)
- Always On
- Model Decision
- Glob

## Limits
- Rule files are limited to 12000 characters each.

## Enterprise system-level rules
- macOS: `/Library/Application Support/Windsurf/rules/*.md`
- Linux/WSL: `/etc/windsurf/rules/*.md`
- Windows: `C:\ProgramData\Windsurf\rules\*.md`
