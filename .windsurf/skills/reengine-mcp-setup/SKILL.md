---
name: reengine-mcp-setup
description: Configure Windsurf MCP servers for RE Engine (dev stdio and prod remote HTTP), including env interpolation and tool enablement.
---

# RE Engine MCP Setup

## Inputs needed
- target environment: dev/staging/prod
- credentials stored in env vars

## Procedure
1) Read `docs/WINDSURF-MCP.md`
2) Draft `mcp_config.json` entries for GitHub + RE Engine servers
3) Ensure no secrets are written into repo
4) Validate tool list stays under 100 enabled tools
