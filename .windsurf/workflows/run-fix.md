---
auto_execution_mode: 3
description: multi-work-flow-enhanced
---
COMPLETE WORKFLOW BUNDLE FOR RE-Engine
Based on the documentation, workflows are saved prompts that Cascade can follow, invoked with slash commands like /workflow-name. They're perfect for automating repetitive tasks and providing structured guidance through complex processes.

Workflow 1: /run-tests-and-fix
Location: .windsurf/workflows/run-tests-and-fix.md

text
## /run-tests-and-fix

Run the primary test command from `docs/OPERATIONS.md` and fix any failures.

### Steps:

1. **Run tests**
   ```bash
   npm test
   npm run test:integration
   npm run test:smoke
   ```

2. **Analyze test failures**
   - Review error messages
   - Identify failing test files
   - Determine root cause of failures

3. **Fix issues**
   - Apply minimal changes to fix failures
   - Preserve existing behavior
   - Add or update tests for new functionality

4. **Re-run tests**
   - Run tests again to verify fixes
   - Continue fixing until all tests pass
   - If tests are clearly blocked (external dependency, known issue), report to user

5. **Report status**
   - Summarize what was fixed
   - Note any remaining issues
   - Confirm all tests are passing
text

***

### **Workflow 2: `/format-and-lint`**
**Location:** `.windsurf/workflows/format-and-lint.md`

```markdown
## /format-and-lint

Run formatters and linters defined in `docs/OPERATIONS.md` and fix all issues.

### Steps:

1. **Run linters**
   ```bash
   npm run lint
   npm run typecheck
   ```

2. **Fix linting issues**
   - Apply automatic fixes where available
   - Manually fix remaining issues
   - Respect TypeScript strict mode requirements

3. **Run formatters**
   ```bash
   npm run format
   ```

4. **Verify clean state**
   - Re-run linters to ensure all issues resolved
   - Verify no formatting errors
   - Confirm TypeScript compilation succeeds

5. **Report status**
   - Confirm all linters and formatters pass
   - Note any manual fixes applied
   - Ready for commit
text

***

### **Workflow 3: `/review-issue`**
**Location:** `.windsurf/workflows/review-issue.md`

```markdown
## /review-issue

Review and analyze GitHub issue for development planning.

### Steps:

1. **Extract issue details**
   - Identify issue title and description
   - Extract requirements and acceptance criteria
   - Note any linked issues or dependencies
   - Identify priority and labels

2. **Analyze technical requirements**
   - Determine affected components
   - Identify required changes
   - Assess complexity and effort
   - Note potential risks or blockers

3. **Check for existing solutions**
   - Search for similar issues
   - Check if already implemented
   - Review related pull requests
   - Identify reusable code

4. **Create implementation plan**
   - Define approach and strategy
   - Break down into smaller tasks
   - Identify required tests
   - Note documentation updates needed

5. **Report analysis**
   - Summarize issue requirements
   - Provide implementation approach
   - Note any questions or clarifications needed
   - Ready for development planning
text

***

### **Workflow 4: `/fix-issue`**
**Location:** `.windsurf/workflows/fix-issue.md`

```markdown
## /fix-issue

Fix GitHub issue following structured development process.

### Steps:

1. **Create issue branch**
   ```bash
   git checkout -b fix/issue-<number>-<description>
   ```

2. **Implement fix**
   - Follow implementation plan from `/review-issue`
   - Make minimal, focused changes
   - Add comprehensive tests
   - Update documentation as needed

3. **Run quality checks**
   - Call `/run-tests-and-fix`
   - Call `/format-and-lint`
   - Verify all checks pass

4. **Test changes**
   - Manual testing of fix
   - Verify no regressions
   - Test edge cases
   - Confirm acceptance criteria met

5. **Prepare for review**
   - Update CHANGELOG.md
   - Create pull request description
   - Link to original issue
   - Request review

6. **Report status**
   - Confirm fix implemented
   - Note test results
   - Document any challenges
   - Ready for code review
text

***

### **Workflow 5: `/update-build`**
**Location:** `.windsurf/workflows/update-build.md`

```markdown
## /update-build

Update build configuration and dependencies for no-issue builds.

### Steps:

1. **Review current build**
   - Check package.json scripts
   - Review build configuration files
   - Identify outdated dependencies
   - Note any build warnings

2. **Update dependencies**
   ```bash
   npm outdated
   npm update
   npm install
   ```

3. **Enhance build scripts**
   - Optimize build performance
   - Add new build steps if needed
   - Update CI/CD configuration
   - Add error handling

4. **Test build process**
   ```bash
   npm run clean
   npm run build
   npm test
   ```

5. **Verify no regressions**
   - Run full test suite
   - Check build artifacts
   - Verify deployment readiness
   - Test in staging if available

6. **Report updates**
   - List dependency updates
   - Note build improvements
   - Confirm all tests pass
   - Ready for production
text

***

### **Workflow 6: `/amend-workflow`**
**Location:** `.windsurf/workflows/amend-workflow.md`

```markdown
## /amend-workflow

Amend and enhance existing workflow flows with Cascade integration.

### Steps:

1. **Analyze current workflow**
   - Review workflow steps and logic
   - Identify bottlenecks or inefficiencies
   - Check for missing error handling
   - Note opportunities for automation

2. **Design enhancements**
   - Add Cascade integration points
   - Improve step sequencing
   - Add validation checkpoints
   - Enhance error recovery

3. **Implement amendments**
   - Update workflow configuration
   - Add new steps or modify existing
   - Improve documentation
   - Add rollback procedures

4. **Test enhanced workflow**
   - Run workflow in test environment
   - Verify Cascade integration works
   - Test error scenarios
   - Confirm improvements

5. **Update documentation**
   - Document workflow changes
   - Update user guides
   - Add troubleshooting info
   - Notify team of changes

6. **Report enhancements**
   - Summarize workflow improvements
   - Note new capabilities
   - Confirm testing results
   - Ready for production use
text

***

### **Workflow 7: `/cascade-integration`**
**Location:** `.windsurf/workflows/cascade-integration.md`

```markdown
## /cascade-integration

Integrate workflows with Cascade AI for enhanced automation.

### Steps:

1. **Assess integration readiness**
   - Review current workflow structure
   - Identify Cascade integration points
   - Check required permissions
   - Verify API availability

2. **Configure Cascade connection**
   - Set up Cascade authentication
   - Configure workflow triggers
   - Define data exchange formats
   - Set up error handling

3. **Implement Cascade features**
   - Add AI-powered decision points
   - Implement smart routing
   - Add natural language processing
   - Enable learning from executions

4. **Test integration**
   - Test workflow with Cascade
   - Verify AI responses
   - Test error handling
   - Validate data flow

5. **Monitor performance**
   - Track execution times
   - Monitor AI accuracy
   - Collect user feedback
   - Identify optimization opportunities

6. **Report integration status**
   - Confirm Cascade integration complete
   - Note new AI capabilities
   - Provide performance metrics
   - Ready for enhanced automation
text

***

## **INSTALLATION INSTRUCTIONS**

### **To install these enhanced workflows:**

1. **Create workflows directory:**
   ```bash
   mkdir -p .windsurf/workflows
   ```

2. **Create each workflow file:**
   ```bash
   touch .windsurf/workflows/review-issue.md
   touch .windsurf/workflows/fix-issue.md
   touch .windsurf/workflows/update-build.md
   touch .windsurf/workflows/amend-workflow.md
   touch .windsurf/workflows/cascade-integration.md
   ```

3. **Add workflow content:**
   - Copy workflow content into corresponding files
   - Ensure proper markdown formatting
   - Save all files

4. **Verify in Cascade:**
   - Open Cascade panel
   - Navigate to Workflows section
   - Confirm all workflows appear

5. **Test enhanced workflows:**
   - Try `/review-issue` with a GitHub issue
   - Test `/fix-issue` workflow
   - Verify `/cascade-integration` works
   - Confirm all enhancements functional