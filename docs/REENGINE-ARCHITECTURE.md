# RE Engine — Architecture (Production Standalone)

## Core principle
Approval-first outbound across channels with comprehensive safety and audit capabilities.

## System Overview
The RE Engine operates as a standalone Node.js application with the following key components:

### Core Components
- **Data Store**: CSV-based storage (phase 1) with upgrade path to Postgres/Neon (phase 2)
- **Approval Service**: Create/list/approve/reject/edit approval workflows
- **Router Service**: Processes only `approved` status items with channel adapters
- **Ingest Services**: Email (IMAP), WhatsApp/Telegram (sessions), Social (snapshot-first)
- **Classification Service**: Message categorization (hot/warm/cold/unknown)
- **Browser Automation**: Playwright-based human-browser agent with self-healing
- **MCP Servers**: Tool servers exposing safe operations to external systems
- **Rate Limiting**: Per-channel throttling with configurable quotas
- **DNC Service**: Do Not Contact enforcement for compliance
- **Retry Service**: Exponential backoff retry logic with dead letter queue

### Data Flow
1. **Inbound Processing**: Messages → Classification → Draft Approvals
2. **Approval Workflow**: Draft → Human Review → Approved/Rejected
3. **Outbound Processing**: Approved → Rate Limit Check → Channel Adapter → Send
4. **Error Handling**: Failed → Retry Logic → Dead Letter (if exhausted)

### Channel Architecture
Each channel (Email, WhatsApp, Telegram, LinkedIn, Facebook) has:
- **Adapter Interface**: Standardized send/receive operations
- **Rate Limits**: Configurable hourly/daily quotas
- **Error Handling**: Channel-specific retry strategies
- **Compliance**: DNC enforcement and approval requirements

## Reliability & Safety
### Safety Invariants
- **Never send** unless approval status is exactly `approved`
- **Never bypass** CAPTCHA/2FA gates
- **Never store** secrets in repository
- **Never auto-reply** to unknown senders
- **Always audit** meaningful actions

### Reliability Features
- **Atomic writes** for CSV operations
- **Concurrency guards** to prevent race conditions
- **Idempotency keys** for safe retries
- **Dead letter queue** for permanently failed items
- **Circuit breakers** for channel failures

## Observability
### Logging & Events
- **Append-only event log** for all operations
- **Structured logging** with correlation IDs
- **Performance metrics** for timing and throughput
- **Error categorization** for debugging

### Browser Automation Artifacts
- **Screenshots** on failures
- **Trace files** for debugging
- **Network logs** (HAR files)
- **Video recordings** of critical operations

## Integration Points
### MCP (Model Context Protocol)
- **Core MCP Server**: Approvals, leads, events, policy operations
- **Browser MCP Server**: Job submission, status, artifact retrieval
- **Integration MCP Server**: External system connections

### External Dependencies
- **Node.js v22+**: Runtime environment
- **Playwright**: Browser automation
- **CSV Files**: Local data persistence
- **Environment Variables**: Configuration and secrets

## Security Model
### Data Protection
- **No secrets in repository**: All sensitive data in environment variables
- **Audit trail**: Complete event history for compliance
- **DNC enforcement**: Automatic blocking of opted-out contacts
- **Approval workflow**: Human review required for all outbound

### Access Control
- **Role-based permissions** for different operations
- **API rate limiting** to prevent abuse
- **Input validation** using Zod schemas
- **Error message sanitization** to prevent information leakage

## Deployment Architecture
### Standalone Mode
- **Single process** deployment
- **Local file system** for data storage
- **Environment configuration** for deployment settings
- **Health checks** for monitoring

### Scalability Considerations
- **Horizontal scaling** via multiple instances
- **Database migration** path for high-volume scenarios
- **Load balancing** for MCP server endpoints
- **Caching layers** for frequently accessed data

## Development Workflow
### Quality Gates
- **TypeScript compilation** with strict mode
- **Unit tests** for all core components
- **Integration tests** for end-to-end workflows
- **Smoke tests** for production readiness

### Testing Strategy
- **Mock adapters** for channel testing
- **Test data fixtures** for consistent testing
- **CI/CD pipeline** for automated testing
- **Manual testing** procedures for browser automation
