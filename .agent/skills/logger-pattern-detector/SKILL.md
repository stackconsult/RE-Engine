# Logger Pattern Detector

## Purpose
Automatically detect incorrect logger API usage patterns across TypeScript codebases where parameters are in wrong order.

## Detection Pattern

### Incorrect Pattern (to detect)
```typescript
logger.info("message", {data: value});
logger.error("error message", {error: details});
logger.warn("warning", {context: info});
logger.debug("debug info", {metadata: data});
logger.fatal("fatal error", {crash: details});
```

### Correct Pattern (target)
```typescript
logger.info({data: value}, "message");
logger.error({error: details}, "error message");
logger.warn({context: info}, "warning");
logger.debug({metadata: data}, "debug info");
logger.fatal({crash: details}, "fatal error");
```

## Detection Algorithm

### Step 1: File Discovery
Scan all TypeScript files in target directories:
```regex
**/*.ts
**/*.tsx
```

### Step 2: Pattern Matching
Use multi-line regex to detect incorrect logger calls:
```regex
logger\.(info|error|warn|debug|fatal)\s*\(\s*(["`'])([^"`']*)\2\s*,\s*(\{[^}]*\})\s*\)
```

**Capture Groups**:
1. Logger method name (info, error, warn, debug, fatal)
2. Quote type (", ', `)
3. Message string content
4. Data object

### Step 3: Context Extraction
For each match, extract:
- **File path**: Full path to TypeScript file
- **Line number**: Line where error occurs
- **Column number**: Starting position
- **Method name**: Which logger method (info/error/warn/debug/fatal)
- **Message**: The string message parameter
- **Data object**: The object parameter
- **Full line**: Complete line of code for context

### Step 4: Error Classification
Classify each detection:
```typescript
interface LoggerIssue {
  file: string;
  line: number;
  column: number;
  method: 'info' | 'error' | 'warn' | 'debug' | 'fatal';
  currentCode: string;
  message: string;
  dataObject: string;
  severity: 'critical' | 'high';
  fixable: boolean;
}
```

## Detection Output Format
```json
{
  "summary": {
    "totalFiles": 28,
    "totalIssues": 847,
    "filesWithIssues": [
      {
        "path": "src/services/lead-service.ts",
        "issueCount": 114,
        "lines": [45, 67, 89, ...]
      }
    ]
  },
  "issues": [
    {
      "file": "src/services/lead-service.ts",
      "line": 45,
      "column": 8,
      "method": "info",
      "currentCode": "logger.info(\"Lead created\", {leadId: lead.id})",
      "message": "Lead created",
      "dataObject": "{leadId: lead.id}",
      "severity": "high",
      "fixable": true
    }
  ]
}
```

## Edge Cases to Handle

### Multi-line Logger Calls
```typescript
logger.info(
  "Long message that spans multiple lines",
  {
    property1: value1,
    property2: value2
  }
);
```

### Template Literals
```typescript
logger.info(`User ${userId} logged in`, {userId, timestamp});
```

### Complex Data Objects
```typescript
logger.error("Error occurred", {
  error: error.message,
  stack: error.stack,
  context: {
    userId: user.id,
    action: 'create_lead'
  }
});
```

### Already Correct Usage (skip)
```typescript
logger.info({leadId: lead.id}, "Lead created"); // SKIP - already correct
```

## Validation Checks
Before marking as fixable:
- ✅ First parameter is string literal or template literal
- ✅ Second parameter is object literal `{...}`
- ✅ Not already in correct format
- ✅ Complete parameter extraction possible
- ✅ No nested function calls within parameters

## Performance Optimization
- Process files in parallel (10 concurrent workers)
- Cache file contents to avoid re-reading
- Skip node_modules and dist directories
- Use streaming for large files
- Report progress every 5 files

## Usage in Agent Workflow
```typescript
// Agent invokes this skill
const detection = await skills.detectLoggerPatterns({
  rootDir: './src',
  extensions: ['.ts', '.tsx'],
  excludeDirs: ['node_modules', 'dist', 'coverage'],
  reportFormat: 'json'
});

console.log(`Found ${detection.summary.totalIssues} issues in ${detection.summary.totalFiles} files`);
```

## When to Use This Skill
- ✅ After logger API changes
- ✅ During build failures with logger errors
- ✅ Pre-deployment code audits
- ✅ Automated code quality checks
- ✅ As part of CI/CD pipeline

## Never Do This
- ❌ Modify files during detection phase
- ❌ Flag already correct logger usage
- ❌ Process non-TypeScript files
- ❌ Skip validation of detection accuracy
