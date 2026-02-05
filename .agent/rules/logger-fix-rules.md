# Logger Fix Automation Rules

## Core Rules

### Rule 1: Safety First - Always Backup
**Priority**: CRITICAL
**Enforcement**: MANDATORY

Before any code transformation:
- ✅ MUST create timestamped backup directory
- ✅ MUST backup ALL files that will be modified
- ✅ MUST verify backup integrity (hash comparison)
- ✅ MUST generate rollback script
- ❌ NEVER proceed without successful backup

**Violation Action**: Abort workflow immediately

### Rule 2: Validate Before Commit
**Priority**: CRITICAL
**Enforcement**: MANDATORY

After any code transformation:
- ✅ MUST run syntax validation
- ✅ MUST run type checking
- ✅ MUST run full build
- ✅ MUST run unit tests
- ❌ NEVER commit without all validations passing

**Violation Action**: Automatic rollback

### Rule 3: Atomic Transformations
**Priority**: HIGH
**Enforcement**: MANDATORY

When transforming logger calls:
- ✅ MUST transform complete function calls only
- ✅ MUST preserve all non-logger code exactly
- ✅ MUST preserve formatting and whitespace
- ✅ MUST validate each transformation independently
- ❌ NEVER modify code outside logger calls

**Violation Action**: Skip file, flag for manual review

### Rule 4: Fail Fast, Rollback Faster
**Priority**: HIGH
**Enforcement**: MANDATORY

On any failure:
- ✅ MUST stop workflow immediately
- ✅ MUST rollback ALL changes
- ✅ MUST verify rollback success
- ✅ MUST generate failure report
- ❌ NEVER leave codebase in partially transformed state

**Violation Action**: Emergency rollback protocol

### Rule 5: Human Approval for Large Changes
**Priority**: MEDIUM
**Enforcement**: CONFIGURABLE

For transformations affecting >100 issues:
- ✅ MUST request human approval before proceeding
- ✅ MUST show detailed summary of planned changes
- ✅ MUST provide dry-run option
- ✅ MUST allow cancellation at any point

**Violation Action**: Workflow pauses for approval

### Rule 6: Preserve Code Intent
**Priority**: HIGH
**Enforcement**: MANDATORY

During transformation:
- ✅ MUST preserve exact message content
- ✅ MUST preserve exact data object structure
- ✅ MUST preserve comments and formatting
- ✅ MUST preserve logical equivalence
- ❌ NEVER change code semantics

**Violation Action**: Rollback file transformation

### Rule 7: Comprehensive Logging
**Priority**: MEDIUM
**Enforcement**: MANDATORY

Throughout workflow:
- ✅ MUST log every transformation
- ✅ MUST log all validation results
- ✅ MUST log errors with full context
- ✅ MUST generate detailed reports
- ❌ NEVER perform silent transformations

**Violation Action**: Warning, continue workflow

### Rule 8: Idempotency
**Priority**: HIGH
**Enforcement**: MANDATORY

Workflow execution:
- ✅ MUST be safe to run multiple times
- ✅ MUST detect already-fixed code
- ✅ MUST skip already-correct logger calls
- ✅ MUST not transform correct code
- ❌ NEVER re-transform fixed code

**Violation Action**: Skip transformation

### Rule 9: Edge Case Handling
**Priority**: HIGH
**Enforcement**: MANDATORY

For complex cases:
- ✅ MUST detect nested logger calls → skip
- ✅ MUST detect dynamic parameters → skip
- ✅ MUST detect malformed calls → skip
- ✅ MUST flag skipped cases for manual review
- ❌ NEVER attempt risky transformations

**Violation Action**: Add to manual review queue

### Rule 10: Report Everything
**Priority**: MEDIUM
**Enforcement**: MANDATORY

After workflow completion:
- ✅ MUST generate success/failure report
- ✅ MUST list all transformed files
- ✅ MUST provide backup location
- ✅ MUST include validation results
- ✅ MUST save report to `.reports/` directory

**Violation Action**: Warning

## Quality Gates

### Gate 1: Detection Quality
- Minimum issues detected: 1
- Maximum false positives: 0%
- Pattern accuracy: 100%

### Gate 2: Transformation Quality
- Syntax preservation: 100%
- Semantic equivalence: 100%
- Formatting preservation: 100%

### Gate 3: Validation Quality
- Syntax validation: PASS
- Type checking: PASS
- Build: PASS
- Unit tests: PASS (or 90%+ if pre-existing failures)

## Agent Behavior Rules

### When Detection Finds Zero Issues
```typescript
if (detection.totalIssues === 0) {
  return SUCCESS("No logger issues detected - codebase is clean");
}
```

### When Backup Fails
```typescript
if (!backup.success) {
  throw CRITICAL_ERROR("Backup failed - aborting workflow");
}
```

### When Transformation Partially Fails
```typescript
if (transformation.status === 'partial') {
  WARN("Some files failed transformation");
  FLAG_FOR_MANUAL_REVIEW(transformation.failures);
  PROCEED_WITH_VALIDATION(transformation.successes);
}
```

### When Validation Fails
```typescript
if (!validation.passed) {
  ROLLBACK_ALL_CHANGES();
  GENERATE_ERROR_REPORT();
  return FAILURE(validation.details);
}
```

### When Rollback Fails
```typescript
if (!rollback.success) {
  TRIGGER_EMERGENCY_ALERT();
  GENERATE_MANUAL_RECOVERY_GUIDE();
  return CRITICAL_FAILURE();
}
```

## Forbidden Actions

### ❌ NEVER Do These Things
1. Transform code without backups
2. Commit without validation
3. Modify production files directly
4. Skip syntax/type checking
5. Ignore test failures
6. Delete backups before commit
7. Transform non-logger code
8. Proceed after rollback failure
9. Make assumptions about code structure
10. Skip error logging

## Emergency Procedures

### Emergency Rollback Protocol
```bash
# If workflow fails catastrophically
1. Stop all processes: Ctrl+C
2. Run emergency rollback: npm run emergency-rollback
3. Verify codebase state: npm run build
4. Check git status: git status
5. Manual verification: Review modified files
```

### Manual Recovery Steps
```bash
# If automatic rollback fails
1. Find latest backup: ls -la .backups/
2. Identify timestamp: logger-fix-{timestamp}
3. Run manual restore: npm run manual-restore -- --backup={timestamp}
4. Verify restoration: git diff
5. Reset if needed: git reset --hard HEAD
```

## Compliance Requirements

### Production Code Rules
- ✅ MUST have approval for >100 changes
- ✅ MUST run full test suite
- ✅ MUST retain backups for 7 days minimum
- ✅ MUST generate audit trail

### Development Code Rules
- ✅ CAN skip approval for <100 changes
- ✅ CAN use faster validation (skip some tests)
- ✅ CAN auto-commit on success

## Rule Enforcement Levels

### CRITICAL (Abort Immediately)
- No backup created
- Backup verification failed
- Validation failed
- Rollback failed

### HIGH (Stop and Report)
- Transformation syntax error
- Type checking failure
- Build failure
- Semantic change detected

### MEDIUM (Warn and Continue)
- Logging incomplete
- Report generation failed
- Non-critical test failure

### LOW (Log Only)
- Performance degradation
- Verbose output suppressed

## Monitoring & Alerts

### Alert on These Conditions
- ⚠️ >10% of transformations fail
- ⚠️ Validation takes >2x expected time
- ⚠️ Rollback triggered
- 🚨 Rollback fails
- 🚨 Backup verification fails

## Success Metrics

### Workflow Success Criteria
- 100% of detected issues fixed
- 0% of non-logger code changed
- 100% validation pass rate
- 100% rollback success rate (if needed)
- <5 minutes total execution time (for 28 files)

## Rule Review & Updates

These rules should be reviewed and updated:
- After each workflow execution with failures
- When new edge cases discovered
- When logger API changes
- Monthly during team retrospectives
