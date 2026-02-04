# RE Engine - Complete Architecture Map

## Overview
This document maps the complete RE Engine architecture including all skills, MCP connections, A2D/A2U components, and SDK implementations.

## 1. Skills Architecture

### Core Skills (Windsurf Cascade)
```
.windsurf/skills/
├── reengine-builder/           # Build engine modules and scaffolding
├── reengine-operator/           # Daily operations and monitoring
├── reengine-mcp-setup/          # MCP server configuration
├── reengine-playwright-agent/  # Browser automation
├── reengine-coding-agent/      # Code development and refactoring
├── reengine-self-healing/      # Error recovery and system health
├── reengine-release-and-pr/     # Release management
└── reengine-tinyfish-scraper/  # Web scraping integration
```

### User-Facing Skills
```
skills/
└── reengine-outreach/          # Outreach command interface
```

## 2. MCP Server Architecture

### Core MCP Servers
```
mcp/
├── reengine-core/              # Core business logic
│   ├── approvals CRUD
│   ├── leads management
│   ├── events tracking
│   └── policy enforcement
├── reengine-browser/           # Browser automation
│   ├── page navigation
│   ├── element interaction
│   ├── screenshots
│   └── data extraction
├── reengine-integrations/      # External system connections
│   ├── GitHub operations
│   ├── database queries
│   └── API integrations
└── reengine-tinyfish/          # Web scraping
    ├── URL scraping
    ├── link extraction
    └── content parsing
```

## 3. Agent Components Architecture

### A2D (Agent-to-Data) Components
```
engine/src/a2d/
├── adapters/                   # Data access adapters
│   ├── csv-adapter.ts         # CSV file operations
│   ├── database-adapter.ts    # Database operations (future)
│   └── cache-adapter.ts       # Caching layer
├── repositories/              # Data repositories
│   ├── approvals.repository.ts
│   ├── leads.repository.ts
│   ├── events.repository.ts
│   └── contacts.repository.ts
├── models/                    # Data models
│   ├── approval.model.ts
│   ├── lead.model.ts
│   ├── event.model.ts
│   └── contact.model.ts
└── validators/                # Data validation
    ├── approval.validator.ts
    ├── lead.validator.ts
    └── event.validator.ts
```

### A2U (Agent-to-User) Components
```
engine/src/a2u/
├── channels/                  # Communication channels
│   ├── email.channel.ts
│   ├── whatsapp.channel.ts
│   ├── telegram.channel.ts
│   └── social.channel.ts
├── adapters/                  # Channel adapters
│   ├── email.adapter.ts
│   ├── whatsapp.adapter.ts
│   └── telegram.adapter.ts
├── formatters/               # Message formatting
│   ├── email.formatter.ts
│   ├── whatsapp.formatter.ts
│   └── social.formatter.ts
└── compliance/               # Compliance checks
    ├── dnc.service.ts
    ├── rate-limiter.ts
    └── approval-gate.ts
```

### SDK Components
```
engine/src/sdk/
├── client/                   # RE Engine client SDK
│   ├── reengine-client.ts
│   ├── types.ts
│   └── config.ts
├── auth/                     # Authentication
│   ├── auth.service.ts
│   ├── token.manager.ts
│   └── permissions.ts
├── monitoring/               # Monitoring and metrics
│   ├── metrics.service.ts
│   ├── health.check.ts
│   └── audit.logger.ts
└── utils/                    # Utilities
    ├── id.generator.ts
    ├── date.utils.ts
    └── validation.utils.ts
```

## 4. Data Flow Architecture

### Inbound Flow
```
External Sources → Ingest Services → Classification → Draft Approvals
```

### Approval Flow
```
Draft → Human Review → Approve/Reject → Audit Log
```

### Outbound Flow
```
Approved → Rate Limit Check → Channel Adapter → Send → Event Log
```

### Error Handling Flow
```
Failed → Retry Logic → Dead Letter → Human Notification
```

## 5. Service Architecture

### Core Services
```
engine/src/services/
├── approval.service.ts       # Approval workflow management
├── router.service.ts         # Outbound message routing
├── ingest.service.ts          # Inbound message processing
├── classification.service.ts  # Message categorization
├── retry.service.ts          # Retry logic and dead letter
├── dnc.service.ts            # Do Not Contact enforcement
└── rate-limit.service.ts     # Rate limiting per channel
```

### Worker Services
```
services/
├── email-worker.ts           # Email processing worker
├── social-worker.ts          # Social media worker
├── cleanup-worker.ts         # Data cleanup worker
└── monitoring-worker.ts      # System monitoring worker
```

## 6. Browser Automation Architecture

### Playwright Components
```
playwright/src/
├── core/                     # Core browser automation
│   ├── browser.manager.ts
│   ├── page.manager.ts
│   └── element.interactor.ts
├── artifacts/                # Artifact management
│   ├── screenshot.manager.ts
│   ├── trace.manager.ts
│   └── video.manager.ts
├── heal/                     # Self-healing
│   ├── self.healing.manager.ts
│   ├── retry.strategies.ts
│   └── fallback.handlers.ts
└── observability/            # Observability
    ├── performance.tracker.ts
    ├── error.logger.ts
    └── metrics.collector.ts
```

## 7. Security & Compliance Architecture

### Security Components
```
engine/src/security/
├── encryption.service.ts     # Data encryption
├── audit.service.ts          # Audit logging
├── permission.service.ts     # Permission management
└── secret.manager.ts         # Secret management
```

### Compliance Components
```
engine/src/compliance/
├── dnc.enforcer.ts          # DNC enforcement
├── approval.gate.ts         # Approval gating
├── rate.limiter.ts          # Rate limiting
└── consent.manager.ts       # Consent management
```

## 8. Configuration Architecture

### Environment Configuration
```
config/
├── development.json
├── staging.json
├── production.json
└── local.json.template
```

### MCP Configuration
```
.mcp-config/
├── dev.json                 # Development MCP config
├── staging.json            # Staging MCP config
└── production.json         # Production MCP config
```

## 9. Testing Architecture

### Test Structure
```
tests/
├── unit/                    # Unit tests
│   ├── services/
│   ├── repositories/
│   └── utilities/
├── integration/             # Integration tests
│   ├── mcp/
│   ├── channels/
│   └── workflows/
├── e2e/                     # End-to-end tests
│   ├── user.workflows.ts
│   ├── approval.flows.ts
│   └── outbound.sending.ts
└── fixtures/                # Test fixtures
    ├── mock.data.ts
    ├── test.leads.csv
    └── sample.approvals.csv
```

## 10. Deployment Architecture

### Container Architecture
```
docker/
├── Dockerfile.engine        # Main engine
├── Dockerfile.mcp          # MCP servers
├── docker-compose.yml       # Local development
└── docker-compose.prod.yml  # Production deployment
```

### Infrastructure Components
```
infrastructure/
├── kubernetes/              # K8s manifests
├── terraform/              # Infrastructure as code
├── monitoring/             # Monitoring setup
└── logging/                # Logging configuration
```

## 11. Integration Points

### External Integrations
```
integrations/
├── email/                   # Email providers
│   ├── sendgrid.adapter.ts
│   ├── ses.adapter.ts
│   └── smtp.adapter.ts
├── social/                  # Social platforms
│   ├── facebook.adapter.ts
│   ├── linkedin.adapter.ts
│   └── twitter.adapter.ts
├── messaging/               # Messaging platforms
│   ├── whatsapp.adapter.ts
│   ├── telegram.adapter.ts
│   └── slack.adapter.ts
└── data/                    # Data sources
    ├── crm.adapter.ts
    ├── analytics.adapter.ts
    └── storage.adapter.ts
```

## 12. Observability Architecture

### Monitoring Components
```
observability/
├── metrics/                 # Metrics collection
│   ├── business.metrics.ts
│   ├── technical.metrics.ts
│   └── custom.metrics.ts
├── logging/                 # Structured logging
│   ├── audit.logger.ts
│   ├── error.logger.ts
│   └── performance.logger.ts
├── tracing/                 # Distributed tracing
│   ├── trace.manager.ts
│   └── span.context.ts
└── alerting/               # Alert management
    ├── alert.rules.ts
    ├── notification.manager.ts
    └── escalation.policy.ts
```

## Implementation Priority

### Phase 1 (Core Foundation)
1. Complete A2D components (data layer)
2. Implement core services
3. Build MCP server integrations
4. Create SDK client

### Phase 2 (Channel Integration)
1. Implement A2U components
2. Build channel adapters
3. Add compliance layer
4. Create monitoring

### Phase 3 (Advanced Features)
1. Browser automation integration
2. Self-healing mechanisms
3. Advanced analytics
4. Scalability improvements

## Next Steps

This architecture map provides the foundation for building out all components systematically. Each component should be implemented following the RE Engine production rules and safety invariants.
