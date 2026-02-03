# RE Engine (Production)

Production-grade Real Estate Outreach Engine: approval-first outbound + inbound ingest + browser automation, designed as a standalone system with MCP integration and Windsurf Cascade orchestration.

## Start here
- `docs/DOC-MAP.md` (navigation)
- `REENGINE-PRODUCTION-SPEC.md` (master spec)

Keystone docs:
- `docs/RELIABILITY-SYSTEM.md`
- `docs/BROWSER-AGENT-HORDE.md`
- `docs/REENGINE-ARCHITECTURE.md`

## Prerequisites
- Node.js v22+ (required)

See:
- `docs/NODE-INSTALL.md`

## Developer bootstrap
```bash
npm run build
npm run test
npm run smoke
```

## Operating principle
Never send unless an approval record is explicitly `status=approved`.