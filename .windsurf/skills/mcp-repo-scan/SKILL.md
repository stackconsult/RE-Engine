Location: .windsurf/skills/mcp-repo-scan/SKILL.md

text
---
name: mcp-repo-scan
description: Conduct comprehensive multi-pass scan of RE-Engine repository to generate/refresh architecture, flows, operations, and MCP server documentation for informed development decisions
---

# Purpose
Maintain current, accurate documentation of RE-Engine's architecture, workflows, and MCP integration points to enable Cascade to make informed decisions during development, refactoring, and MCP enhancements.

# Pre-Scan Checklist
- [ ] Repository is on latest commit
- [ ] No uncommitted changes exist
- [ ] All components build successfully (`npm run build` in engine, web-dashboard, playwright, mcp/*)

# Scan Phases

## Phase 1: Architecture Survey
1. Detect primary languages and frameworks:
   - TypeScript 60.5%, JavaScript 25.2%
   - Node.js v22+, React, Playwright
   - PostgreSQL, Redis for data storage

2. Identify main components and their responsibilities:
   - `engine/` - Core backend API, business logic, message routing
   - `web-dashboard/` - React-based approval UI and monitoring
   - `playwright/` - Browser automation harness for human-in-the-loop tasks
   - `mcp/` - MCP servers (reengine-core, reengine-browser, reengine-tinyfish)
   - `scripts/` - Deployment and utility scripts

3. Document component entrypoints and dependencies

## Phase 2: Flow Discovery
4. Map key real estate outreach flows:
   - Lead capture → CSV storage → enrichment → approval queue
   - Approval decision → multi-channel delivery (WhatsApp, Telegram, Email, LinkedIn, Facebook)
   - Automated scheduling (daily drafts at 8:00 AM, IMAP polling every 15 min)
   - Response routing and capture

5. Trace end-to-end flow for each channel:
   - Request/command → handlers → jobs → DB/queues → external services
   - Document data transformations and validation points

## Phase 3: Operations Inventory
6. Locate development commands:
   - Build: `npm run build` (per component)
   - Test: `npm test`, `npm run test:integration`, `npm run test:smoke`
   - Lint: `npm run lint`, `npm run format`
   - Type-check: `npm run typecheck`
   - Start: `npm run dashboard`, `npm run mcp:start`

7. Document deployment commands:
   - Staging: `npm run deploy:staging` or GitHub Actions on develop branch
   - Production: `npm run deploy:production` or GitHub Actions on release
   - CI/CD pipeline structure (test → security → build → deploy)

8. Document environment requirements:
   - Required env vars (from `.env.example`)
   - Database connections (PostgreSQL, Redis)
   - External service integrations (WhatsApp, Telegram, Email providers)

## Phase 4: MCP Server Analysis
9. Scan `mcp/` directory for existing servers:
   - `mcp-reengine-core/` - Core business logic tools
   - `mcp-reengine-browser/` - Playwright/browser automation tools
   - `mcp-reengine-tinyfish/` - Specialized tools

10. Document each MCP server:
    - Available tools and their purposes
    - Input/output schemas
    - Authentication requirements
    - Error handling patterns

11. Verify MCP server startup: `npm run mcp:start`

## Phase 5: Documentation Generation
12. Create/update documentation files:
    - `docs/ARCHITECTURE.md` - Component structure and responsibilities
    - `docs/FLOWS.md` - End-to-end workflow traces
    - `docs/OPERATIONS.md` - Dev/test/deploy commands and requirements
    - `docs/MCP_SERVERS.md` - MCP server inventory and tool descriptions

13. Generate summary report with:
    - Components discovered
    - Flows mapped
    - MCP servers identified
    - Documentation files updated
    - Recommendations for improvements

## Output
Present complete scan report to user with option to:
- Proceed with development using updated docs
- Request specific flow investigation
- Update documentation further
Supporting Files:

.windsurf/skills/mcp-repo-scan/architecture-template.md

.windsurf/skills/mcp-repo-scan/flows-template.md

.windsurf/skills/mcp-repo-scan/operations-template.md

.windsurf/skills/mcp-repo-scan/mcp-servers-template.md