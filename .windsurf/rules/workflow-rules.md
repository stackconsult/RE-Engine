COMPLETE CASCADE RULE SET FOR RE-ENGINE
File Location: .windsurf/rules/reengine-context.md
Activation Mode: Model Decision (recommended for this comprehensive rule)
text
# RE-Engine Context and Development Guidelines

RE-Engine is a production-grade real estate outreach automation platform built with Node.js, TypeScript, React, and Playwright. The system integrates MCP (Model Context Protocol) servers for enhanced AI capabilities.

**Project Overview:**
- **Purpose:** Multi-channel outreach automation (WhatsApp, Telegram, Email, LinkedIn, Facebook)
- **Architecture:** Microservices with MCP integration
- **Database:** PostgreSQL (migration from CSV in progress)
- **Deployment:** Google Cloud Platform (Cloud Run)
- **CI/CD:** GitHub Actions with comprehensive testing

---

## Project Structure

### Core Components:
RE-Engine/
├── engine/ # Backend API and business logic
├── web-dashboard/ # React approval dashboard
├── playwright/ # Browser automation harness
├── mcp/ # MCP servers
│ ├── mcp-reengine-core/ # Core business logic tools
│ ├── mcp-reengine-browser/ # Playwright/browser automation tools
│ └── mcp-reengine-tinyfish/ # Specialized tools
├── scripts/ # Deployment and utility scripts
└── docs/ # Documentation

text

### Key Directories:
- **`/engine`**: REST API, message routing, business logic
- **`/web-dashboard`**: React-based approval UI
- **`/playwright`**: Browser automation scripts
- **`/mcp`**: MCP server implementations
- **`/data`**: CSV storage (legacy, migrating to PostgreSQL)
- **`/tests`**: Unit and integration tests

---

## Technology Stack

### Languages & Frameworks:
- **Backend:** Node.js v22+, TypeScript 5.7+
- **Frontend:** React, TypeScript
- **Testing:** Jest, Playwright
- **Database:** PostgreSQL (Neon/Supabase), Redis
- **CI/CD:** GitHub Actions, Docker, Cloud Run

### Key Libraries:
- **MCP Integration:** Model Context Protocol servers
- **Browser Automation:** Playwright
- **Messaging:** OpenClaw, Ollama AI models
- **Validation:** Zod, TypeScript strict mode

---

## Development Workflow

### Always Use Skills for Complex Tasks:
When working on substantial changes, **always** use the appropriate MCP skill:

1. **Discovery:** `@mcp-repo-scan` - Refresh documentation before starting
2. **Planning:** `@mcp-change-plan` - Create implementation plan
3. **Implementation:** `@mcp-implement-plan` - Execute plan iteratively
4. **Refactoring:** `@mcp-refactor-safe` - Safe code restructuring
5. **MCP Work:** `@mcp-mcp-integration` - MCP server development

### Use Workflows for Repetitive Tasks:
Invoke workflows with slash commands for automation:

**Testing & Quality:**
- `/run-tests-and-fix` - Run tests and fix failures
- `/format-and-lint` - Code formatting and linting
- `/run-integration-tests` - Database integration tests
- `/security-scan` - Security vulnerability scanning
- `/performance-test` - Performance benchmarking

**Development:**
- `/prepare-pr` - Prepare pull request
- `/feature-development` - Complete feature workflow
- `/bugfix-development` - Bug fixing workflow
- `/environment-setup` - Development environment setup

**Deployment:**
- `/deploy-staging` - Deploy to staging
- `/deploy-production` - Deploy to production
- `/rollback-production` - Production rollback

**MCP-Specific:**
- `/build-mcp-servers` - Build all MCP servers
- `/mcp-testing` - Test MCP servers and tools
- `/mcp-tool-development` - Develop new MCP tools

**Maintenance:**
- `/update-dependencies` - Update dependencies
- `/database-migration` - CSV to PostgreSQL migration
- `/repository-scan` - Comprehensive documentation
- `/release-preparation` - Prepare release

---

## Coding Standards

### TypeScript Requirements:
- **Always use strict mode:** `"strict": true` in tsconfig.json
- **Never disable type checking** for production code
- **Use explicit types** - avoid `any`
- **Type all function parameters and return values**
- **Use utility types** (`Partial`, `Pick`, `Omit`) when appropriate

### Naming Conventions:
- **Variables/Functions:** camelCase
- **Classes/Types:** PascalCase
- **Constants:** UPPER_SNAKE_CASE
- **Files:** kebab-case
- **MCP Tools:** descriptive, lowercase with hyphens (e.g., `send-whatsapp-message`)

### Code Structure:
- **Single Responsibility Principle** - one function = one job
- **Small functions** - max 20-30 lines
- **Extract reusable utilities** - don't duplicate code
- **Use early returns** - avoid deep nesting
- **Document complex logic** - inline comments for non-obvious code

### Error Handling:
- **Always handle errors** - never ignore them
- **Use try-catch blocks** for async operations
- **Return meaningful error messages** - include context
- **Log errors** - use structured logging
- **Validate inputs** - validate all external inputs

### Testing Requirements:
- **Unit tests** - test individual functions/modules
- **Integration tests** - test component interactions
- **Test coverage** - aim for 80%+ coverage
- **Test all error conditions** - don't just test happy paths
- **Use mocks** - isolate tests from external dependencies

---

## MCP Development Guidelines

### MCP Server Structure:
Each MCP server follows this pattern:
mcp-reengine-<name>/
├── package.json
├── src/
│ ├── tools/ # Tool implementations
│ ├── schemas/ # Input/output schemas
│ └── index.ts # Server entry point
├── tests/
│ └── tool-tests.ts
└── README.md

text

### MCP Tool Design:
- **Single Responsibility** - one tool = one action
- **Clear Schemas** - define input and output schemas
- **Error Handling** - handle all error conditions
- **Documentation** - document tool purpose and usage
- **Type Safety** - use TypeScript for tool implementations

### MCP Integration:
- **Use existing tools** - compose tools when possible
- **Avoid duplication** - reuse existing functionality
- **Test thoroughly** - MCP tools affect multiple components
- **Document in `docs/MCP_SERVERS.md`** - keep documentation current

---

## Git Workflow

### Branching Strategy:
- **`main`** - Production code
- **`develop`** - Integration branch
- **`feature/<name>`** - Feature branches
- **`bugfix/<issue>`** - Bug fix branches
- **`release/vX.Y.Z`** - Release branches

### Commit Conventions:
Use conventional commits:
- `feat:` - New feature
- `fix:` - Bug fix
- `refactor:` - Code refactoring
- `docs:` - Documentation changes
- `test:` - Test changes
- `chore:` - Maintenance tasks
- `perf:` - Performance improvement
- `style:` - Code formatting
- `ci:` - CI/CD changes

### Pull Request Requirements:
- **Link to plan** - reference `plans/YYYY-MM-DD-*.md`
- **Test coverage** - all tests must pass
- **Documentation** - update relevant docs
- **Code review** - get at least one approval
- **Squash commits** - clean commit history

---

## Deployment Process

### Staging Deployment:
1. Push to `develop` branch
2. GitHub Actions runs tests
3. If tests pass → deploy to Cloud Run staging
4. Verify staging URLs
5. Run smoke tests

### Production Deployment:
1. Create GitHub release with semantic versioning
2. GitHub Actions validates and builds
3. Deploy to Cloud Run production
4. Verify production URLs
5. Post to Slack #deployments channel

### Rollback Procedure:
1. Identify last good commit
2. Create rollback branch
3. Deploy rollback
4. Monitor production
5. Investigate root cause

---

## Security Requirements

### Authentication:
- **All API endpoints** require authentication
- **Use JWT tokens** - implement proper token management
- **Secure secrets** - never commit to repo
- **Environment variables** - use `.env` files

### Data Protection:
- **Approval-first system** - no outbound messages without approval
- **Audit logging** - log all actions to `events.csv`
- **Mask sensitive data** - never expose in tool responses
- **Rate limiting** - prevent abuse and API abuse

### Vulnerability Management:
- **Run `npm audit`** - check for vulnerabilities
- **Update dependencies** - keep packages current
- **Security scans** - run Trivy scans regularly
- **Fix high/critical issues** - prioritize security fixes

---

## Documentation Standards

### Required Documentation:
- **`docs/ARCHITECTURE.md`** - Component structure and responsibilities
- **`docs/FLOWS.md`** - End-to-end workflow documentation
- **`docs/OPERATIONS.md`** - Development, testing, deployment commands
- **`docs/MCP_SERVERS.md`** - MCP server and tool documentation
- **`docs/API.md`** - API endpoint documentation
- **`docs/CHANGELOG.md`** - Version history and changes

### Inline Documentation:
- **JSDoc comments** - for public APIs
- **Function comments** - for complex logic
- **TODO comments** - for known issues/tech debt
- ** FIXME comments** - for temporary workarounds

### Commit Messages:
- **Descriptive** - explain what changed
- **Concise** - keep under 72 characters
- **Link to issues** - reference GitHub issues
- **Follow conventional commits**

---

## Testing Strategy

### Test Pyramid:
text
      Tests
     /    \
Integration  Unit
   |        |
End-to-End Component
\ /
Smoke

text

### Test Coverage Goals:
- **Unit tests:** 70%+ coverage
- **Integration tests:** 50%+ coverage
- **E2E tests:** Critical paths covered
- **Type checking:** 100% clean

### Test Naming:
- **Descriptive** - describe what's being tested
- **Follow pattern:** `describe/it` blocks
- **Test one thing** - one assertion per test (ideally)

---

## Performance Guidelines

### Optimization Strategies:
- **Caching** - cache frequently accessed data
- **Database indexing** - index query fields
- **Batch operations** - minimize database round-trips
- **Connection pooling** - reuse database connections
- **Lazy loading** - load data only when needed

### Monitoring:
- **Log response times** - identify slow endpoints
- **Monitor error rates** - catch issues early
- **Track resource usage** - CPU, memory, database
- **Set alerts** - for performance degradation

---

## Approval System Requirements

### Critical Constraint:
**NO OUTBOUND MESSAGES WITHOUT EXPLICIT APPROVAL**

The approval system is core to RE-Engine's functionality:
- All messages go to approval queue
- Users review and approve/reject
- Only approved messages are sent
- Audit trail maintained for all actions

### Implementation:
- **Web dashboard** - `/web-dashboard` for approvals
- **API endpoints** - `/api/approvals` for programmatic access
- **Notifications** - alert users for pending approvals
- **Timeouts** - auto-reject after configurable period

---

## CI/CD Pipeline

### GitHub Actions Workflow:
Test → Security Scan → Build → Deploy (Staging/Production)

text

### Pipeline Requirements:
- **All tests pass** - before proceeding
- **Security scans clean** - no high/critical vulnerabilities
- **Build successful** - all components compile
- **Test coverage** - meets minimum thresholds

### Environment Variables:
- **Staging:** `develop` branch
- **Production:** GitHub release tag
- **Secrets:** Never commit to repo, use GitHub Secrets

---

## Common Pitfalls to Avoid

### ❌ DON'T:
- Commit `.env` files with secrets
- Disable TypeScript strict mode
- Ignore test failures
- Bypass approval system
- Hardcode credentials
- Push directly to `main`
- Skip documentation updates
- Make breaking API changes without versioning
- Ignore security vulnerabilities

### ✅ DO:
- Use skills for complex tasks
- Run workflows for repetitive tasks
- Test before committing
- Document changes
- Review pull requests
- Follow semantic versioning
- Monitor production metrics
- Handle errors gracefully

---

## Troubleshooting

### Common Issues:
- **TypeScript errors:** Check `tsconfig.json`, ensure strict mode
- **Test failures:** Run tests individually, check mocks
- **Deployment issues:** Verify environment variables, check logs
- **MCP errors:** Verify tool schemas, check server status
- **Database errors:** Verify migrations, check connections

### Debugging:
- **Console logs:** Use `console.log` strategically
- **Debug mode:** Enable debugging in configuration
- **Error tracking:** Use structured logging
- **Monitoring:** Check Cloud Run logs and metrics

---

## Quick Reference Commands

### Development:
```bash
# Install dependencies
npm install

# Build all components
npm run build

# Run tests
npm test
npm run test:integration
npm run test:smoke

# Lint and format
npm run lint
npm run format

# Start services
npm run dashboard
npm run mcp:start
```

### MCP Development:
```bash
# Build MCP servers
cd mcp && npm run build:all && cd -

# Test MCP servers
npm run mcp:test

# Start MCP servers
npm run mcp:start
```

### Deployment:
```bash
# Deploy to staging
npm run deploy:staging

# Deploy to production
npm run deploy:production

# Rollback production
npm run rollback:production
```

---

## When to Use Skills vs Workflows

### Use Skills When:
- Creating new features
- Refactoring code
- Developing MCP tools
- Complex planning needed
- Multi-step implementation

### Use Workflows When:
- Running tests
- Formatting code
- Preparing PRs
- Deploying
- Running repetitive tasks
- Quick automation

---

## Collaboration Guidelines

### Code Reviews:
- Be constructive - provide helpful feedback
- Ask questions - clarify unclear code
- Suggest improvements - offer alternatives
- Test changes - verify functionality
- Respect - be professional and courteous

### Communication:
- Use @mentions - for specific people
- Link to issues - provide context
- Be clear - avoid ambiguity
- Respond promptly - keep momentum
- Document decisions - in PRs and issues

---

## Production Readiness Checklist

Before merging to main or deploying:
- [ ] All tests pass
- [ ] Type checking clean
- [ ] Linting passes
- [ ] Security scan clean
- [ ] Documentation updated
- [ ] MCP servers build successfully
- [ ] Integration tests pass
- [ ] No breaking changes (or properly versioned)
- [ ] Approval system unaffected
- [ ] Performance acceptable
- [ ] Database migrations included (if needed)
- [ ] Rollback plan documented

---

## Emergency Procedures

### Production Outage:
1. Assess impact - determine severity
2. Check logs - identify root cause
3. Rollback - if fix not immediate
4. Communicate - inform team/stakeholders
5. Fix - implement permanent solution
6. Monitor - verify fix works
7. Post-mortem - document and learn

### Security Incident:
1. Contain - limit damage
2. Investigate - identify breach
3. Notify - inform stakeholders
4. Fix - patch vulnerability
5. Audit - review all code
6. Prevent - implement safeguards
7. Document - create incident report

---

## Final Notes

### Core Principles:
- Quality over speed - write maintainable code
- Test everything - verify all changes
- Document well - help future you
- Collaborate effectively - leverage team knowledge
- Think production - code for reliability

### Remember:
- Skills are your friends - use them for complex work
- Workflows save time - automate repetitive tasks
- MCP is powerful - use it wisely
- Approval system is sacred - never bypass it
- Testing is non-negotiable - always test
- Documentation matters - keep it current

---

Last Updated: 2026-02-04
Status: Production-ready
Next Review: 2026-03-01

text

***

## **INSTALLATION**

### **Step 1: Create Rules Directory**
```
.windsurf/rules/
```

### **Step 2: Create Rule File**
Create `.windsurf/rules/reengine-context.md` with this content

### **Step 3: Verify Installation**
Open Cascade and confirm rule loads correctly

---

## **HOW CASCADE USES THIS RULE**

### **Activation:**
- **Model Decision Mode:** Cascade automatically applies this rule when it detects relevant context
- **Manual Activation:** You can also manually activate with `@reengine-context`

### **Example Interactions:**

#### **Scenario 1: User asks to implement a feature**
```
User: "Implement LinkedIn messaging in RE-Engine"

Cascade will:
1. Check rule - sees MCP skills and workflows
2. Suggest: "I recommend using @mcp-change-plan to create an implementation plan"
3. Guide user through skill execution
4. Remind about testing requirements
5. Reference approval system requirements
```

#### **Scenario 2: User asks to fix a bug**
```
User: "Fix the message delivery failure bug"

Cascade will:
1. Check rule - sees bugfix workflow
2. Suggest: "I'll help you fix this using the bugfix-development workflow"
3. Guide through steps: add test → implement fix → test → document
4. Remind about approval system impact
5. Reference testing requirements
```

#### **Scenario 3: User asks to deploy**
```
User: "Deploy to production"

Cascade will:
1. Check rule - sees deployment workflows
2. Remind: "Before deploying, ensure all tests pass and security scans are clean"
3. Guide through /deploy-production workflow
4. Remind about rollback procedure
5. Reference deployment checklist
```

#### **Scenario 4: User asks about architecture**
```
User: "How does the approval system work?"

Cascade will:
1. Check rule - sees approval system requirements
2. Explain: "The approval system is core to RE-Engine. NO OUTBOUND MESSAGES WITHOUT EXPLICIT APPROVAL"
3. Reference web dashboard and API endpoints
4. Emphasize this is a critical constraint