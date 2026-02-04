---
name: build-agentic-workflow
description: From a business requirement, design and implement a production-grade B2B automation or agentic workflow (triggers, jobs, queues, observability, safety) following the global automation rules, with code, docs, and tests wired end-to-end.
---

# Purpose
Design and implement complete B2B automation workflows that are production-ready, observable, and safe, following global automation rules (Rule 3) and agent-friendly conventions (Rule 2).

# Prerequisites
- ✅ Business requirement clearly defined
- ✅ Global rules reviewed (Rule 1, Rule 2, Rule 3)
- ✅ Repository documentation current: `@mcp-repo-scan`
- ✅ Target systems and integrations identified
- ✅ Risk level assessed (Low/Medium/High)

# Design Phase

## 1. Requirements Analysis
**Steps:**
1. Extract business context and success criteria
2. Identify triggers, systems touched, and data flows
3. Assess risk level and safety requirements
4. Determine human-in-the-loop needs

## 2. Architecture Design
**Following Rule 3 principles:**
- **Separation of concerns:** Triggers → Business logic → Persistence
- **Idempotency:** Design safe retry mechanisms
- **Durability:** Queue-based processing for long-running work
- **Isolation:** External integration modules
- **Observability:** Structured logging and metrics
- **Safety:** Human checkpoints and auditability

## 3. Workflow Documentation
**Create workflow spec:**
1. Use template: `.windsurf/workflows/work-flow-md.md`
2. Complete all sections (no blanks allowed)
3. Get human approval for High/Medium risk workflows
4. Save as: `docs/workflows/<workflow-name>.md`

# Implementation Phase

## 4. Core Implementation
**For each component:**

### Triggers
- Webhook handlers with validation
- Scheduled jobs with cron expressions  
- Message bus listeners
- UI action handlers

### Business Logic
- Pure or mostly-pure functions
- Clear error handling
- Input validation and sanitization
- Decision logic and branching

### Persistence
- Repository/DAO patterns
- Database schemas and migrations
- Cache strategies
- Transaction handling

### External Integrations
- Dedicated integration modules
- Timeout and retry logic
- Secret management (environment variables)
- Error handling and fallbacks

## 5. Queue and Job Infrastructure
**Following Rule 3 queue semantics:**
- Job structure with clear schemas
- Bounded retries with backoff
- Dead-letter queue (DLQ) setup
- Concurrency controls and locks

## 6. Observability Implementation
**Logging:**
- Structured JSON logging
- Correlation IDs across flows
- Key events (start/finish/errors)
- Non-sensitive metadata only

**Metrics:**
- Throughput and success rates
- Latency measurements
- Error rates by type
- Queue depths and processing times

## 7. Safety and Guardrails
**Human-in-the-loop:**
- Approval checkpoints for high-risk actions
- Clear action summaries and rationale
- Audit trails for all changes

**Guardrails:**
- No destructive operations without confirmation
- Security/permission changes flagged
- Bulk operations require safeguards

# Testing Phase

## 8. Test Strategy
**Unit Tests:**
- Business logic edge cases
- Error handling paths
- Validation logic
- Integration module mocks

**Integration Tests:**
- End-to-end workflow simulation
- External service mocking
- Queue processing tests
- Database transaction tests

**Idempotency Tests:**
- Duplicate request handling
- Retry behavior verification
- Partial failure recovery

## 9. Test Implementation
**Test locations:**
- Unit: `tests/unit/workflows/<name>/`
- Integration: `tests/integration/workflows/<name>/`
- E2E: `tests/e2e/workflows/<name>/`

**Test commands:**
```bash
npm test                    # Unit tests
npm run test:integration    # Integration tests  
npm run test:e2e           # E2E tests
```

# Documentation Phase

## 10. Documentation Updates
**Required docs:**
- `docs/workflows/<name>.md` - Complete workflow spec
- `docs/OPERATIONS.md` - Runbook entries
- `docs/plans/<name>-implementation.md` - Implementation plan
- API documentation for new endpoints
- Update `docs/DOC-MAP.md` with new components

## 11. Runbook Creation
**Operations runbook:**
- Health check procedures
- Common failure modes and responses
- Manual intervention steps
- Monitoring and alerting setup

# Quality Gates

## 12. Pre-deployment Checklist
**Code Quality:**
- ✅ TypeScript strict mode compliance
- ✅ All tests passing
- ✅ Code coverage > 80%
- ✅ No linting errors
- ✅ Security scan passed

**Architecture Compliance:**
- ✅ Follows Rule 1 (Qwen coding standards)
- ✅ Follows Rule 2 (Repo conventions)
- ✅ Follows Rule 3 (Automation principles)
- ✅ No secrets in code
- ✅ Proper error handling

**Operational Readiness:**
- ✅ Observability hooks implemented
- ✅ Alerts configured
- ✅ Runbooks documented
- ✅ Rollback plan defined

## 13. Deployment
**Staged rollout:**
1. Deploy to dev environment
2. Run smoke tests: `@run-tests-and-fix`
3. Deploy to staging (if exists)
4. Final integration tests
5. Production deployment with monitoring

**Post-deployment:**
- Monitor key metrics for 24 hours
- Verify all alerts working
- Update documentation with real-world learnings
- Retrospective and improvements

# References to Other Skills
- `@mcp-repo-scan` - Initial repository analysis
- `@mcp-change-plan` - Create implementation plan
- `@mcp-implement-plan` - Execute implementation steps
- `@reengine-coding-agent` - Code writing and refactoring
- `@run-tests-and-fix` - Test execution and bug fixing

# Global Rules Compliance
This skill explicitly follows:
- **Rule 1:** Uses Qwen3-Coder-Next for coding tasks with test-driven approach
- **Rule 2:** Maintains agent-friendly repo structure and conventions  
- **Rule 3:** Implements automation with idempotency, queues, observability, and safety
