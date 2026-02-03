# RE Engine - Deployment Guide

## Quick Start

### Prerequisites
- Node.js v22+
- npm or yarn

### Installation
```bash
# Clone the repository
git clone https://github.com/stackconsult/reengine.git
cd reengine

# Install dependencies
npm install

# Build the system
npm run build

# Run tests
npm run test

# Run smoke test
npm run smoke
```

### Environment Setup
Create a `.env` file in the root directory:

```env
# Data directory
REENGINE_DATA_DIR=./data

# Logging
LOG_LEVEL=info

# MCP Server (optional)
MCP_SERVER_PORT=3000
```

## System Architecture

### Core Components
1. **Engine** (`/engine`) - Core business logic and data management
2. **MCP Servers** (`/mcp`) - Tool servers for external integrations
3. **Playwright** (`/playwright`) - Browser automation with self-healing
4. **Skills** (`/.windsurf/skills`) - Windsurf Cascade integration
5. **Rules** (`/.windsurf/rules`) - System policies and constraints

### Data Storage
- **Phase 1**: CSV-based storage in `./data` directory
- **Phase 2**: Postgres/Neon migration path available

### Key Files
- `engine/src/index.ts` - Main engine exports
- `engine/src/ops/smoke.ts` - Production smoke test
- `mcp/reengine-core/src/index.ts` - MCP server implementation
- `playwright/src/runner.ts` - Browser automation runner

## Running the System

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
# Build everything
npm run build

# Start MCP server
npm run start:mcp

# Run smoke test
npm run smoke
```

### Individual Components
```bash
# Engine only
cd engine && npm run smoke

# MCP server only
cd mcp/reengine-core && npm start

# Playwright tests
cd playwright && npm run test
```

## Configuration

### Rate Limiting
Default rate limits are configured in `engine/src/util/rateLimiter.ts`:
- Email: 50/hour, 500/day
- WhatsApp: 20/hour, 150/day
- Telegram: 30/hour, 200/day
- LinkedIn: 5/hour, 25/day
- Facebook: 5/hour, 25/day

### DNC Enforcement
The DNC service automatically blocks:
- Phone numbers and emails on the DNC list
- Configurable reasons and bulk operations
- Compliance tracking and audit trails

### Safety Invariants
The system enforces these non-negotiable rules:
1. **Never send** unless approval status is exactly `approved`
2. **Never bypass** CAPTCHA/2FA gates
3. **Never store** secrets in repository
4. **Never auto-reply** to unknown senders
5. **Always audit** meaningful actions

## Monitoring

### Health Checks
```bash
# Run smoke test
npm run smoke

# Check system status
cd engine && node dist/ops/smoke.js
```

### Logs
- Engine logs: `./logs/engine.log`
- Playwright logs: `./logs/playwright.log`
- MCP server logs: Console output

### Artifacts
- Screenshots: `./artifacts/{jobId}/`
- Traces: `./artifacts/{jobId}/{jobId}.zip`
- Network logs: `./artifacts/{jobId}/{jobId}.har`

## MCP Integration

### Available Tools
The MCP server exposes these tools:
- `approvals_list` - List approvals with optional status filter
- `approvals_approve` - Approve a pending approval
- `approvals_reject` - Reject a pending approval
- `leads_import_csv` - Import leads from CSV data
- `events_query` - Query events with filters

### MCP Configuration
Add to your MCP config (`~/.codeium/windsurf/mcp_config.json`):

```json
{
  "mcpServers": {
    "reengine-core": {
      "command": "node",
      "args": ["/path/to/reengine/mcp/reengine-core/dist/index.js"],
      "cwd": "/path/to/reengine"
    }
  }
}
```

## Troubleshooting

### Common Issues
1. **Build fails**: Check Node.js version (requires v22+)
2. **Tests fail**: Ensure all dependencies are installed
3. **MCP server won't start**: Check port conflicts
4. **Browser automation fails**: Install Playwright browsers

### Debug Mode
```bash
# Enable debug logging
LOG_LEVEL=debug npm run smoke

# Run with Node inspector
node --inspect engine/dist/ops/smoke.js
```

## Production Deployment

### Docker Deployment
```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "start:mcp"]
```

### Environment Variables
```env
NODE_ENV=production
REENGINE_DATA_DIR=/app/data
LOG_LEVEL=info
MCP_SERVER_PORT=3000
```

### Scaling Considerations
- Use external database for high volume
- Deploy multiple MCP server instances
- Implement load balancing for browser automation
- Monitor rate limits and DNC compliance

## Security

### Secrets Management
- Never commit secrets to repository
- Use environment variables for sensitive data
- Rotate API keys regularly
- Audit access to production systems

### Compliance
- DNC enforcement is mandatory
- All outbound messages require approval
- Complete audit trail maintained
- Data retention policies configurable

## Support

### Documentation
- `docs/` - Comprehensive documentation
- `README.md` - Quick start guide
- `REENGINE-PRODUCTION-SPEC.md` - Master specification

### Getting Help
- Check logs for error details
- Run smoke test for system health
- Review MCP server output for integration issues
- Consult architecture documentation for design questions
