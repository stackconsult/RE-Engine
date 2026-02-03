# Windsurf Cascade — MCP (Model Context Protocol)

Source: https://docs.windsurf.com/windsurf/cascade/mcp

## Key facts
- MCP config file: `~/.codeium/windsurf/mcp_config.json`
- Transports supported: `stdio`, `Streamable HTTP`, `SSE`
- OAuth supported for each transport type.
- Cascade tool limit: 100 total enabled MCP tools at a time.
- Config interpolation supports `${env:VAR}` in `command`, `args`, `env`, `serverUrl`, `url`, `headers`.

## Example stdio config (GitHub)
```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "<YOUR_PERSONAL_ACCESS_TOKEN>"
      }
    }
  }
}
```

## Remote HTTP MCP config
Uses `serverUrl` or `url` plus optional `headers`.

## Team/Enterprise admin controls
- Whitelisting uses regex full-string matching and is case-sensitive.
- Once any server is whitelisted, all others are blocked.
