---
name: mcp-change-plan
description: A brief description, shown to the model to help it understand when to use this skill
---

---
name: mcp-change-plan
description: Transform user requirements into detailed, RE-Engine-specific implementation plans with risk assessment, phased execution strategy, and documentation requirements
---

# Purpose
Convert vague requirements into concrete, actionable plans that respect RE-Engine's architecture, MCP integration patterns, and production deployment constraints.

# Inputs Required
- User's natural language goal or requirement
- Current state documentation (from @mcp-repo-scan):
  - `docs/ARCHITECTURE.md`
  - `docs/FLOWS.md`
  - `docs/OPERATIONS.md`
  - `docs/MCP_SERVERS.md`
- Acceptance criteria (if provided by user)

# Classification Phase

## 1. Requirement Analysis
Analyze user's goal and classify into one of these categories:

**Feature Development:**
- New outreach channel integration
- Enhanced approval workflow
- Additional automation capabilities
- Dashboard enhancements
- MCP tool additions

**Bug Fix:**
- Message delivery failures
- UI state management issues
- Data synchronization problems
- Authentication/authorization flaws
- External API integration errors

**Refactoring:**
- Code organization improvements
- Performance optimization
- Dependency updates
- Technical debt reduction
- Pattern standardization

**MCP Integration:**
- New MCP server development
- MCP tool expansion
- MCP client enhancements
- Cross-server communication
- Tool composition

**Infrastructure:**
- CI/CD pipeline improvements
- Deployment automation
- Monitoring and logging
- Security hardening
- Database migrations

**Hybrid:**
- Combination of above categories
- Multi-phase initiatives

## 2. Impact Assessment
For the classified requirement, determine:

### Affected Components
- List specific directories/files impacted
- Identify which of: engine, web-dashboard, playwright, mcp/*, scripts

### Flow Disruption
- Which end-to-end flows are affected?
- Will existing users experience downtime?
- Are there data migration requirements?

### MCP Integration Points
- Which MCP servers/tools are involved?
- Are new MCP tools needed?
- Does this affect existing MCP client usage?

### Risk Factors
- **High Risk:** Authentication, payment/data integrity, external API changes
- **Medium Risk:** UI changes, new features, performance optimizations
- **Low Risk:** Documentation, minor refactors, test improvements

### Breaking Changes
- Will this break existing API contracts?
- Does it require database migrations?
- Are there external service dependencies?

## 3. Constraints Identification
Identify any constraints that affect the plan:

**Technical Constraints:**
- TypeScript strict mode requirements
- Existing patterns and conventions
- Third-party API rate limits
- Database schema limitations

**Operational Constraints:**
- CI/CD pipeline requirements
- Security scanning must pass
- Test coverage thresholds
- Deployment windows

**Business Constraints:**
- Approval-first system requirements
- Audit logging requirements
- User notification needs

# Planning Phase

## 4. Phased Implementation Plan
Create detailed plan with numbered phases. Save to `plans/YYYY-MM-DD-target.md`.

### Phase 1: Discovery & Design
**Objective:** Fully understand requirements and design solution

**Steps:**
1. Clarify ambiguous requirements with user questions
2. Review relevant documentation and existing code
3. Design architecture for new feature/refactor
4. Define data structures and API contracts
5. Document design decisions and alternatives considered
6. Get user sign-off on design

**Deliverables:**
- Design document
- API specifications (if applicable)
- Database schema changes (if applicable)
- User interface mockups (if applicable)

### Phase 2: Implementation
**Objective:** Build the solution incrementally with testing

**Steps:**
1. Set up development environment
2. Create necessary directories and files
3. Implement core functionality (minimal viable)
4. Add unit tests for new code
5. Integrate with existing components
6. Test integration points
7. Refine implementation based on testing

**Component-Specific Steps:**
- **Engine:** Implement business logic, API endpoints, service layers
- **Web-Dashboard:** Create React components, state management, API calls
- **Playwright:** Write automation scripts, test scenarios
- **MCP Servers:** Define tool schemas, implement handlers, add tests
- **Scripts:** Create deployment/utility scripts

**Deliverables:**
- Implemented code
- Unit tests
- Integration test stubs

### Phase 3: Testing
**Objective:** Verify functionality and quality

**Steps:**
1. Run component unit tests: `npm test`
2. Run integration tests: `npm run test:integration`
3. Run end-to-end tests (if applicable): Playwright tests
4. Verify TypeScript type-checking: `npm run typecheck`
5. Run linting: `npm run lint`
6. Fix any failures or warnings
7. Verify test coverage meets requirements

**Deliverables:**
- All tests passing
- Code quality metrics met
- Test coverage report

### Phase 4: Documentation
**Objective:** Update all relevant documentation

**Steps:**
1. Update `docs/CHANGELOG.md` with changes
2. Update `docs/ARCHITECTURE.md` if structure changed
3. Update `docs/FLOWS.md` if workflows changed
4. Update `docs/MCP_SERVERS.md` for MCP changes
5. Update inline code documentation
6. Update API documentation (if applicable)

**Deliverables:**
- Updated documentation files
- Code comments where necessary

### Phase 5: Deployment Preparation
**Objective:** Prepare for production deployment

**Steps:**
1. Verify CI/CD pipeline compatibility
2. Ensure security scans will pass
3. Prepare deployment scripts
4. Document deployment procedure
5. Identify rollback plan
6. Get final user approval

**Deliverables:**
- Deployment checklist
- Rollback procedure
- User documentation (if applicable)

## 5. Assumptions & Open Questions
Document any assumptions made and questions requiring user clarification:

**Assumptions:**
- [List all assumptions about requirements, data, integrations]

**Open Questions:**
- [List questions that need user answers before proceeding]

**Breaking Changes:**
- [List any breaking changes and migration paths]

# Approval Phase

## 6. Present Plan to User
Provide complete plan with:
- Classification and impact assessment
- Phased implementation strategy
- Time estimates (if possible)
- Resource requirements
- Risk mitigation strategies
- Open questions requiring answers

**Request user approval before proceeding to implementation.**

# Post-Approval Actions
If user approves:
- Proceed to Phase 1: Discovery & Design
- Begin implementation per plan

If user requests changes:
- Revise plan based on feedback
- Re-present for approval

If user has questions:
- Answer questions
- Clarify requirements
- Update plan as needed
Supporting Files:

.windsurf/skills/mcp-change-plan/plan-template.md

.windsurf/skills/mcp-change-plan/feature-checklist.md

.windsurf/skills/mcp-change-plan/bugfix-checklist.md

.windsurf/skills/mcp-change-plan/refactor-checklist.md

.windsurf/skills/mcp-change-plan/mcp-integration-checklist.md