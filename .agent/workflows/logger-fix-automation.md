# Automated Logger Fix Workflow

## Overview
End-to-end automated workflow for detecting and fixing incorrect logger API usage across RE-Engine codebase with validation and rollback capabilities.

## Workflow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    LOGGER FIX WORKFLOW                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 1: Detection                                          │
│  ├─ Scan codebase for logger patterns                       │
│  ├─ Identify incorrect parameter order                      │
│  ├─ Generate detection report                               │
│  └─ Estimate transformation scope                           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 2: Backup & Preparation                               │
│  ├─ Create timestamped backup directory                     │
│  ├─ Backup all files with issues                            │
│  ├─ Verify backup integrity                                 │
│  └─ Generate rollback script                                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 3: Transformation                                     │
│  ├─ Transform files in parallel (5 concurrent)              │
│  ├─ Swap logger parameters (object, message)                │
│  ├─ Preserve formatting and whitespace                      │
│  └─ Generate transformation report                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 4: Validation                                         │
│  ├─ Layer 1: Syntax validation (2s)                         │
│  ├─ Layer 2: Type checking (8s)                             │
│  ├─ Layer 3: Build verification (25s)                       │
│  └─ Layer 4: Unit tests (10s)                               │
└─────────────────────────────────────────────────────────────┘
                            │
                  ┌─────────┴─────────┐
                  │                   │
            ✅ Success            ❌ Failure
                  │                   │
                  ▼                   ▼
         ┌────────────────┐   ┌──────────────────┐
         │ Phase 5: Commit│   │ Phase 5: Rollback│
         │ ├─ Git add      │   │ ├─ Restore files │
         │ ├─ Git commit   │   │ ├─ Verify restore│
         │ └─ Success      │   │ └─ Report failure│
         │    report       │   │                  │
         └────────────────┘   └──────────────────┘
```

## Detailed Workflow Steps

### Phase 1: Detection & Analysis
**Agent Mode**: Planning Mode
**Duration**: ~30 seconds
**Skills Used**: `logger-pattern-detector`

```typescript
// Step 1.1: Initialize detection
const detection = await agent.invokeSkill('logger-pattern-detector', {
  rootDir: './src',
  extensions: ['.ts', '.tsx'],
  excludeDirs: ['node_modules', 'dist', 'coverage', 'tests'],
  reportFormat: 'detailed'
});

// Step 1.2: Analyze detection results
if (detection.summary.totalIssues === 0) {
  return {
    status: 'success',
    message: 'No logger issues detected - codebase is clean'
  };
}

// Step 1.3: Generate human-readable summary
console.log(`
📊 Logger Issue Detection Report
================================
Total Files Scanned: ${detection.summary.totalFiles}
Files With Issues: ${detection.summary.filesWithIssues.length}
Total Issues Found: ${detection.summary.totalIssues}

Top 5 Files by Issue Count:
${detection.summary.filesWithIssues
  .sort((a, b) => b.issueCount - a.issueCount)
  .slice(0, 5)
  .map(f => `  - ${f.path}: ${f.issueCount} issues`)
  .join('\n')}

Estimated Fix Time: ${estimateFixTime(detection.summary.totalIssues)}
`);

// Step 1.4: Request human approval for large-scale changes
if (detection.summary.totalIssues > 100) {
  const approval = await agent.requestApproval({
    title: 'Logger Fix Transformation',
    message: `Found ${detection.summary.totalIssues} logger issues across ${detection.summary.filesWithIssues.length} files. Proceed with automated fix?`,
    details: detection.summary
  });
  
  if (!approval.approved) {
    return { status: 'cancelled', reason: 'User declined approval' };
  }
}
```

### Phase 2: Backup & Safety
**Agent Mode**: Editor Mode
**Duration**: ~10 seconds
**Skills Used**: Built-in file operations

```typescript
// Step 2.1: Create timestamped backup directory
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = `./.backups/logger-fix-${timestamp}`;
await fs.ensureDir(backupDir);

console.log(`📦 Creating backups in: ${backupDir}`);

// Step 2.2: Backup all files with issues
const backupResults = await Promise.all(
  detection.summary.filesWithIssues.map(async file => {
    const sourcePath = file.path;
    const backupPath = path.join(backupDir, file.path);
    
    await fs.ensureDir(path.dirname(backupPath));
    await fs.copy(sourcePath, backupPath);
    
    // Verify backup integrity
    const sourceHash = await hashFile(sourcePath);
    const backupHash = await hashFile(backupPath);
    
    return {
      file: sourcePath,
      backup: backupPath,
      verified: sourceHash === backupHash
    };
  })
);

// Step 2.3: Verify all backups successful
const allBackupsValid = backupResults.every(r => r.verified);
if (!allBackupsValid) {
  throw new Error('Backup verification failed - aborting transformation');
}

console.log(`✅ Backed up ${backupResults.length} files successfully`);

// Step 2.4: Generate rollback script
await generateRollbackScript(backupDir, backupResults);
```

### Phase 3: Transformation
**Agent Mode**: Editor Mode
**Duration**: ~2-5 minutes
**Skills Used**: `logger-parameter-transformer`

```typescript
// Step 3.1: Invoke transformation skill
console.log('🔄 Starting parameter transformation...');

const transformResult = await agent.invokeSkill('logger-parameter-transformer', {
  detectionResults: detection,
  backupLocation: backupDir,
  parallelProcessing: 5,
  validateAfterEach: true,
  dryRun: false
});

// Step 3.2: Monitor transformation progress
transformResult.on('progress', (progress) => {
  console.log(`  Progress: ${progress.filesProcessed}/${progress.totalFiles} files (${progress.percentage}%)`);
});

// Step 3.3: Handle transformation results
if (transformResult.status === 'success') {
  console.log(`
✅ Transformation Complete
==========================
Files Modified: ${transformResult.summary.filesModified}
Total Transformations: ${transformResult.summary.totalTransformations}
Duration: ${transformResult.summary.duration}
  `);
} else if (transformResult.status === 'partial') {
  console.warn(`
⚠️ Partial Transformation
=========================
Files Modified: ${transformResult.summary.filesModified}
Files Failed: ${transformResult.summary.filesFailed}

Failed Files:
${transformResult.failures.map(f => `  - ${f.file}: ${f.reason}`).join('\n')}
  `);
}
```

### Phase 4: Validation
**Agent Mode**: Fast Mode
**Duration**: ~45 seconds
**Skills Used**: `code-transformation-validator`

```typescript
// Step 4.1: Sequential validation layers
console.log('🔍 Starting validation process...');

const validationResult = await agent.invokeSkill('code-transformation-validator', {
  files: transformResult.modifiedFiles,
  projectRoot: './RE-Engine',
  backupLocation: backupDir,
  autoRollback: true,
  stopOnFirstFailure: true
});

// Step 4.2: Handle validation results
if (validationResult.passed) {
  console.log(`
✅ All Validation Layers Passed
================================
✓ Syntax validation (${validationResult.layers.syntax.duration})
✓ Type checking (${validationResult.layers.types.duration})
✓ Build verification (${validationResult.layers.build.duration})
✓ Unit tests (${validationResult.layers.tests.duration})

Total Duration: ${validationResult.duration}
  `);
} else {
  console.error(`
❌ Validation Failed at Stage: ${validationResult.failedStage}
================================================================
${validationResult.errors.map(e => `  - ${e.file}:${e.line} - ${e.message}`).join('\n')}

Recommendation: ${validationResult.recommendation}
  `);
  
  // Validation will auto-rollback if configured
  if (validationResult.rollback?.success) {
    console.log('✅ Rollback completed successfully - codebase restored');
  }
  
  return {
    status: 'failed',
    stage: validationResult.failedStage,
    details: validationResult
  };
}
```

### Phase 5a: Success - Commit Changes
**Agent Mode**: Editor Mode
**Duration**: ~5 seconds

```typescript
// Step 5.1: Stage changes
console.log('📝 Committing changes...');

await git.add(transformResult.modifiedFiles);

// Step 5.2: Create detailed commit message
const commitMessage = `
fix: Correct logger API parameter order across codebase

- Fixed ${transformResult.summary.totalTransformations} logger calls
- Changed parameter order from (message, data) to (data, message)
- Affected ${transformResult.summary.filesModified} files
- All validation layers passed

Automated fix applied by logger-fix-automation workflow
Backup location: ${backupDir}
`;

await git.commit(commitMessage);

// Step 5.3: Generate success report
const successReport = {
  status: 'success',
  timestamp: new Date().toISOString(),
  summary: {
    issuesDetected: detection.summary.totalIssues,
    issuesFixed: transformResult.summary.totalTransformations,
    filesModified: transformResult.summary.filesModified,
    validationPassed: true,
    committed: true
  },
  details: {
    detection,
    transformation: transformResult,
    validation: validationResult,
    backupLocation: backupDir
  }
};

// Step 5.4: Save report
await fs.writeJSON('./.reports/logger-fix-report.json', successReport, { spaces: 2 });

console.log(`
🎉 Logger Fix Automation Complete
==================================
✅ All issues fixed and validated
✅ Changes committed to git
📊 Full report: ./.reports/logger-fix-report.json
📦 Backups retained: ${backupDir}
`);

return successReport;
```

### Phase 5b: Failure - Rollback
**Agent Mode**: Fast Mode
**Duration**: ~10 seconds

```typescript
// Rollback is automatically triggered by validation failure
// Manual rollback script also available

console.log(`
🔄 Rollback Process
===================
Restoring files from backup: ${backupDir}
`);

const rollbackResult = await agent.invokeSkill('code-transformation-validator', {
  action: 'rollback',
  backupLocation: backupDir,
  files: transformResult.modifiedFiles
});

if (rollbackResult.success) {
  console.log(`
✅ Rollback Successful
======================
Files Restored: ${rollbackResult.filesRestored}
Codebase Status: Reverted to pre-transformation state

Next Steps:
1. Review validation errors: ./.reports/logger-fix-errors.json
2. Fix complex cases manually
3. Re-run workflow for remaining issues
  `);
} else {
  console.error(`
❌ Rollback Failed
==================
Files Restored: ${rollbackResult.filesRestored}
Files Failed: ${rollbackResult.filesFailed}

URGENT: Manual intervention required
Run: npm run manual-rollback -- --backup=${backupDir}
  `);
}
```

## Workflow Execution Modes

### Mode 1: Fully Automated (Default)
```bash
# One-command execution
npm run workflow:logger-fix
```

### Mode 2: Interactive (Human Approval Gates)
```bash
# Requires approval at each phase
npm run workflow:logger-fix -- --interactive
```

### Mode 3: Dry Run (Preview Only)
```bash
# Simulates without making changes
npm run workflow:logger-fix -- --dry-run
```

### Mode 4: Targeted Fix (Specific Files)
```bash
# Fix only specific files
npm run workflow:logger-fix -- --files="src/services/lead-service.ts,src/services/property-service.ts"
```

## Error Handling & Recovery

### Automatic Recovery Mechanisms
1. **Backup Failure** → Abort before transformation
2. **Transformation Error** → Rollback affected file immediately
3. **Syntax Error** → Rollback all files, report error
4. **Build Failure** → Full rollback, generate error report
5. **Test Failure** → Optional rollback (configurable)

### Manual Recovery Commands
```bash
# Manual rollback to latest backup
npm run logger-fix:rollback

# Rollback to specific backup
npm run logger-fix:rollback -- --backup=.backups/logger-fix-2026-02-05-132800

# Verify rollback success
npm run logger-fix:verify-rollback
```

## Performance Metrics

### Expected Timeline
```
Phase 1: Detection          ~30s
Phase 2: Backup            ~10s
Phase 3: Transformation    ~120s (2 min)
Phase 4: Validation        ~45s
Phase 5: Commit            ~5s
─────────────────────────────────
Total:                     ~210s (3.5 min)
```

### Scalability
- **Small Codebase** (<10 files): ~1 minute
- **Medium Codebase** (10-50 files): ~3-5 minutes
- **Large Codebase** (50-100 files): ~5-10 minutes
- **Enterprise Codebase** (100+ files): ~10-20 minutes

## Success Criteria
- ✅ All logger issues detected
- ✅ All transformations applied correctly
- ✅ Syntax validation passes
- ✅ Type checking passes
- ✅ Build succeeds
- ✅ Unit tests pass
- ✅ Changes committed to git
- ✅ Backup retained for rollback

## Workflow Configuration

### Configuration File
**Location:** `.agent/workflows/logger-fix-config.json`

```json
{
  "detection": {
    "rootDir": "./src",
    "extensions": [".ts", ".tsx"],
    "excludeDirs": ["node_modules", "dist", "coverage"],
    "parallel": 10
  },
  "transformation": {
    "parallelProcessing": 5,
    "validateAfterEach": true,
    "preserveFormatting": true
  },
  "validation": {
    "layers": ["syntax", "types", "build", "tests"],
    "stopOnFirstFailure": true,
    "autoRollback": true
  },
  "backup": {
    "enabled": true,
    "location": "./.backups",
    "retention": "7 days"
  },
  "approval": {
    "required": true,
    "threshold": 100
  }
}
```

## When to Run This Workflow
- ✅ After logger API changes
- ✅ During code refactoring projects
- ✅ Before major releases
- ✅ As part of technical debt cleanup
- ✅ When build fails with logger errors

## Never Do This
- ❌ Run without backup enabled
- ❌ Skip validation layers
- ❌ Commit without testing
- ❌ Ignore rollback failures
- ❌ Delete backups before validation
