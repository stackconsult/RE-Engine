---
name: mcp-implement-plan
description: Execute approved implementation plans through iterative, test-backed development while maintaining RE-Engine architecture and MCP integration patterns
---

# Purpose
Systematically implement approved plans using small, test-backed changes that respect RE-Engine's architecture, TypeScript strict mode, and production deployment requirements.

# Prerequisites
- ✅ Approved plan exists in `plans/YYYY-MM-DD-target.md`
- ✅ Repository documentation is current (run @mcp-repo-scan if uncertain)
- ✅ No uncommitted changes exist
- ✅ All tests pass on current state: `npm test && npm run test:integration`

# Implementation Strategy
Follow iterative, test-driven approach:
1. Work one plan step at a time
2. Make minimal, focused changes
3. Test after each change
4. Commit frequently with descriptive messages
5. Document decisions inline

# Execution Phase

## 1. Environment Setup
**Steps:**
1. Ensure on correct branch (usually `develop`)
2. Pull latest changes: `git pull origin develop`
3. Install dependencies if needed: `npm install`
4. Verify build: `npm run build`
5. Verify tests: `npm test && npm run test:integration`

## 2. Iterative Implementation
**For each step in the approved plan:**

### Step A: Code Changes
1. Identify target files from plan
2. Follow existing patterns and conventions:
   - Respect TypeScript strict mode
   - Follow error handling patterns
   - Use existing utility functions where applicable
   - Maintain consistent naming conventions

3. Make minimal changes to achieve goal
4. Add inline comments for complex logic
5. Ensure code is testable

### Step B: Unit Testing
1. Create or update unit tests for changed code
2. Test edge cases and error conditions
3. Verify test coverage for new code
4. Run tests: `npm test` in affected component
5. Fix any failures before proceeding

**Component-Specific Testing:**
- **Engine:** Test service methods, API handlers, business logic
- **Web-Dashboard:** Test React components, hooks, API calls
- **Playwright:** Test automation scenarios, page interactions
- **MCP Servers:** Test tool handlers, input validation, error responses

### Step C: Integration Testing
1. Test integration with other components
2. Verify data flow between components
3. Test API endpoints (if applicable)
4. Run integration tests: `npm run test:integration`
5. Fix any failures

### Step D: Type Checking & Linting
1. Run type checker: `npm run typecheck`
2. Fix any TypeScript errors
3. Run linter: `npm run lint`
4. Fix any linting issues
5. Run formatter: `npm run format`
6. Verify code style compliance

### Step E: Commit Changes
1. Stage changed files: `git add <files>`
2. Write descriptive commit message following conventional commits:
   - `feat:` for new features
   - `fix:` for bug fixes
   - `refactor:` for code refactoring
   - `docs:` for documentation changes
   - `test:` for test changes
   - `chore:` for maintenance tasks
3. Commit: `git commit -m "descriptive message"`

## 3. MCP Integration (If Applicable)

### If Adding/Modifying MCP Tools:
1. Define tool schema in MCP server
2. Implement tool handler with error handling
3. Add unit tests for tool logic
4. Test tool invocation locally
5. Document tool in `docs/MCP_SERVERS.md`

### If Creating New MCP Server:
1. Create directory: `mcp/mcp-reengine-<name>/`
2. Initialize with package.json
3. Define tool schemas
4. Implement tool handlers
5. Add test scripts
6. Document in `docs/MCP_SERVERS.md`

### MCP Testing:
1. Start MCP servers: `npm run mcp:start`
2. Test tool calls from Cascade or test scripts
3. Verify tool responses match schema
4. Test error conditions
5. Document any changes needed

## 4. Cross-Component Testing
**After all component changes:**

1. Run full test suite in each component:
   ```bash
   cd engine && npm test && cd -
   cd web-dashboard && npm test && cd -
   cd playwright && npm test && cd -
   cd mcp/mcp-reengine-core && npm test && cd -
   cd mcp/mcp-reengine-browser && npm test && cd -
   cd mcp/mcp-reengine-tinyfish && npm test && cd -
   ```
2. Run integration tests: `npm run test:integration`
3. Verify Playwright tests: `npm run test:e2e` (if applicable)
4. Verify build: `npm run build`

## 5. Documentation Updates

### Update Documentation Files:
1. Update `docs/CHANGELOG.md`:
   - Add entry with date, category, and description
   - Link to relevant PRs or commits
   - Note any breaking changes

2. Update `docs/ARCHITECTURE.md` (if structure changed):
   - Document new components or patterns
   - Update component responsibilities
   - Add diagrams if helpful

3. Update `docs/FLOWS.md` (if workflows changed):
   - Document new or modified flows
   - Update flow diagrams
   - Note any user-facing changes

4. Update `docs/MCP_SERVERS.md` (if MCP changed):
   - Document new tools or servers
   - Update tool descriptions
   - Add usage examples

5. Update inline documentation:
   - Add JSDoc comments for new public APIs
   - Update existing comments for clarity
   - Document complex algorithms

## 6. Quality Gates

### Verify All Quality Requirements:
1. **TypeScript:** No type errors (`npm run typecheck`)
2. **Linting:** No linting errors (`npm run lint`)
3. **Tests:** All tests pass (`npm test && npm run test:integration`)
4. **Build:** Successful build (`npm run build`)
5. **Security:** No vulnerabilities (`npm audit`)

### If Quality Gates Fail:
- Analyze failures
- Fix issues
- Re-run tests
- Document fixes in commit messages

## 7. Commit & Push

### Final Commit:
1. Stage all changes: `git add .`
2. Review changes: `git status`
3. Create final commit:
   ```bash
   git commit -m "feat: implement <feature>
   
   - Add <specific changes>
   - Update <relevant files>
   - Add tests for <new functionality>
   
   Closes: <issue number if applicable>"
   ```
4. Push to branch: `git push origin <branch-name>`

## 8. Pull Request Preparation

### Create PR Description:
- Use template from PR_DESCRIPTION.md
- Link to plan: `plans/YYYY-MM-DD-target.md`
- Summarize changes
- List breaking changes (if any)
- Note testing performed
- Request specific review focus areas

### PR Checklist:
- ✅ All tests passing
- ✅ Documentation updated
- ✅ Type-checking clean
- ✅ Linting clean
- ✅ No security vulnerabilities
- ✅ Build successful
- ✅ Changes align with plan

## 9. Post-Implementation Review

### Verify Implementation:
After implementation complete:
1. Run full test suite again
2. Verify all components build
3. Test end-to-end flows
4. Verify MCP integration (if applicable)
5. Document any lessons learned

### Present to User:
Provide implementation summary:
1. Changes made
2. Tests passed
3. Documentation updated
4. Any deviations from plan
5. Next steps (testing, review, deployment)
6. Request user approval for next phase (testing, PR, or deployment)

***

**Supporting Files:**
- `.windsurf/skills/mcp-implement-plan/commit-template.md`
- `.windsurf/skills/mcp-implement-plan/test-strategy.md`
- `.windsurf/skills/mcp-implement-plan/mcp-testing-guide.md`
- `.windsurf/skills/mcp-implement-plan/quality-gate-checklist.md`