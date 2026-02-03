# RE Engine — MCP Servers (Planned)

## Why
Use MCP to give Cascade production-grade, auditable tool access to the RE Engine.

## Proposed servers
### 1) reengine-core (local stdio for dev, remote HTTP for prod)
Tools:
- approvals.list
- approvals.approve / reject / edit
- leads.import_csv
- leads.validate
- send.dry_run
- events.query

### 2) reengine-browser
Tools:
- browser.open
- browser.snapshot
- browser.extract_structured
- browser.run_playwright_job

### 3) integrations
Tools:
- github.open_pr
- github.comment
- postgres.readonly_query (later)

### 4) reengine-tinyfish
Tools:
- tinyfish.scrape

## Governance
- Prod: remote HTTP MCP with auth headers; audit logs server-side.
- Dev: stdio MCP for speed.
