# Logger Parameter Transformer

## Purpose
Automatically transform incorrect logger calls by swapping message and data parameters while preserving formatting, whitespace, and code structure.

## Transformation Strategy

### Core Transformation Logic
```typescript
// INPUT (incorrect)
logger.METHOD("message", {data: object})

// OUTPUT (correct)
logger.METHOD({data: object}, "message")
```

### Transformation Rules

#### Rule 1: Simple Single-Line Transformation
```typescript
// Before
logger.info("User logged in", {userId: user.id});

// After
logger.info({userId: user.id}, "User logged in");
```

#### Rule 2: Multi-Line Transformation (preserve indentation)
```typescript
// Before
logger.error(
  "Database connection failed",
  {
    host: dbConfig.host,
    error: error.message
  }
);

// After
logger.error(
  {
    host: dbConfig.host,
    error: error.message
  },
  "Database connection failed"
);
```

#### Rule 3: Template Literal Preservation
```typescript
// Before
logger.info(`Lead ${leadId} scored ${score}`, {leadId, score});

// After
logger.info({leadId, score}, `Lead ${leadId} scored ${score}`);
```

#### Rule 4: Complex Object Transformation
```typescript
// Before
logger.warn("Multiple validation errors", {
  errors: validationErrors.map(e => e.message),
  context: { userId, action: 'update_lead' }
});

// After
logger.warn({
  errors: validationErrors.map(e => e.message),
  context: { userId, action: 'update_lead' }
}, "Multiple validation errors");
```

## Implementation Algorithm

### Step 1: Parse Detection Results
```typescript
interface TransformationJob {
  file: string;
  issues: LoggerIssue[];
  backupPath?: string;
  transformedCode?: string;
}
```

### Step 2: File-Level Processing
For each file with issues:
1. Read entire file content
2. Create backup copy (`.backup` extension)
3. Parse to AST (Abstract Syntax Tree) using TypeScript compiler API
4. Identify all logger call nodes
5. Transform nodes in reverse order (bottom to top to preserve positions)
6. Generate modified code
7. Validate syntax
8. Write to file

### Step 3: AST-Based Transformation
```typescript
import * as ts from 'typescript';

function transformLoggerCall(node: ts.CallExpression): ts.CallExpression {
  if (!isLoggerCall(node)) return node;
  
  const [messageParam, dataParam] = node.arguments;
  
  // Validate parameters
  if (!isStringLiteral(messageParam) || !isObjectLiteral(dataParam)) {
    return node; // Skip if pattern doesn't match
  }
  
  // Swap parameters
  return ts.factory.updateCallExpression(
    node,
    node.expression,
    node.typeArguments,
    [dataParam, messageParam] // SWAPPED ORDER
  );
}
```

### Step 4: Whitespace Preservation
```typescript
function preserveFormatting(original: string, transformed: string): string {
  // Preserve leading whitespace (indentation)
  const leadingWhitespace = original.match(/^(\s*)/)?.[1] || '';
  
  // Preserve trailing whitespace and comments
  const trailingContent = original.match(/(\s*(?:\/\/.*)?$)/)?.[1] || '';
  
  return leadingWhitespace + transformed.trim() + trailingContent;
}
```

## Safety Mechanisms

### Pre-Transformation Validation
- ✅ File exists and is readable
- ✅ File has valid TypeScript syntax
- ✅ Issues detected are still present (no concurrent modifications)
- ✅ Backup directory is writable

### Backup Strategy
```typescript
interface BackupStrategy {
  location: './.backups/logger-fix-{timestamp}/',
  naming: '{originalPath}.backup',
  retention: '7 days',
  autoCleanup: true
}
```

### Rollback Capability
```typescript
async function rollbackTransformation(job: TransformationJob): Promise<void> {
  if (!job.backupPath) {
    throw new Error('No backup available for rollback');
  }
  
  const backupContent = await fs.readFile(job.backupPath, 'utf-8');
  await fs.writeFile(job.file, backupContent, 'utf-8');
  
  console.log(`Rolled back: ${job.file}`);
}
```

## Transformation Output

### Success Report
```json
{
  "status": "success",
  "summary": {
    "filesProcessed": 28,
    "filesModified": 28,
    "totalTransformations": 847,
    "backupLocation": "./.backups/logger-fix-20260205-132800/"
  },
  "details": [
    {
      "file": "src/services/lead-service.ts",
      "transformations": 114,
      "status": "success",
      "backup": "./.backups/logger-fix-20260205-132800/src/services/lead-service.ts.backup"
    }
  ]
}
```

### Failure Handling
```json
{
  "status": "partial",
  "summary": {
    "filesProcessed": 28,
    "filesModified": 27,
    "filesFailed": 1,
    "totalTransformations": 733
  },
  "failures": [
    {
      "file": "src/services/complex-service.ts",
      "reason": "Syntax error after transformation",
      "action": "Rolled back to backup",
      "manualReview": true
    }
  ]
}
```

## Edge Case Handling

### Case 1: Nested Logger Calls (skip)
```typescript
// DO NOT TRANSFORM - too complex
logger.info("Outer", {
  data: logger.warn("Inner", {nested: true})
});
```

### Case 2: Spread Operators
```typescript
// Before
logger.info("Data merged", {...baseData, ...newData});

// After
logger.info({...baseData, ...newData}, "Data merged");
```

### Case 3: Comments Preservation
```typescript
// Before
logger.error(
  "Critical failure", // Error message
  {error: err.message} // Error details
);

// After
logger.error(
  {error: err.message}, // Error details
  "Critical failure" // Error message
);
```

## Validation After Transformation

### Syntax Validation
```typescript
async function validateSyntax(filePath: string): Promise<boolean> {
  const content = await fs.readFile(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true
  );
  
  const diagnostics = ts.getPreEmitDiagnostics(
    ts.createProgram([filePath], {}),
    sourceFile
  );
  
  return diagnostics.length === 0;
}
```

### Build Validation
```bash
# After all transformations, run TypeScript build
npm run build

# Check exit code
if [ $? -eq 0 ]; then
  echo "✅ All transformations successful - build passes"
else
  echo "❌ Build failed - initiating rollback"
fi
```

## Performance Optimization
- Process files in parallel (5 concurrent)
- Use incremental TypeScript compilation
- Cache AST parsing results
- Skip files with no issues
- Batch write operations

## Usage in Agent Workflow
```typescript
// Agent invokes transformation after detection
const transformResult = await skills.transformLoggerParameters({
  detectionResults: detectionOutput,
  backupEnabled: true,
  validateAfterTransform: true,
  parallelProcessing: 5,
  dryRun: false // Set to true for preview without changes
});

if (transformResult.status === 'success') {
  console.log(`✅ Fixed ${transformResult.summary.totalTransformations} logger calls`);
} else {
  console.log(`⚠️ Partial success - ${transformResult.failures.length} files need manual review`);
}
```

## When to Use This Skill
- ✅ After detection confirms issues exist
- ✅ After backup creation
- ✅ During automated refactoring workflows
- ✅ With human approval for production code

## Never Do This
- ❌ Transform without creating backups
- ❌ Skip syntax validation after transformation
- ❌ Process files without detecting issues first
- ❌ Transform production code without testing
- ❌ Ignore transformation failures
