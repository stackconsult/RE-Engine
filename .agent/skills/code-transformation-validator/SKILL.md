# Code Transformation Validator

## Purpose
Validate code transformations through multi-layered testing including syntax validation, type checking, unit tests, and build verification.

## Validation Layers

### Layer 1: Syntax Validation (Immediate)
```typescript
async function validateSyntax(files: string[]): Promise<ValidationResult> {
  const results = await Promise.all(
    files.map(async file => {
      const content = await fs.readFile(file, 'utf-8');
      const sourceFile = ts.createSourceFile(
        file,
        content,
        ts.ScriptTarget.Latest,
        true
      );
      
      // Check for syntax errors
      const syntaxErrors = sourceFile.parseDiagnostics;
      
      return {
        file,
        valid: syntaxErrors.length === 0,
        errors: syntaxErrors.map(d => ({
          line: d.start ? sourceFile.getLineAndCharacterOfPosition(d.start).line : -1,
          message: d.messageText.toString()
        }))
      };
    })
  );
  
  return {
    passed: results.every(r => r.valid),
    results
  };
}
```

### Layer 2: Type Checking (Fast)
```typescript
async function validateTypes(projectRoot: string): Promise<ValidationResult> {
  const configPath = path.join(projectRoot, 'tsconfig.json');
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsedConfig = ts.parseJsonConfigFileContent(
    config.config,
    ts.sys,
    projectRoot
  );
  
  const program = ts.createProgram(
    parsedConfig.fileNames,
    parsedConfig.options
  );
  
  const diagnostics = ts.getPreEmitDiagnostics(program);
  
  return {
    passed: diagnostics.length === 0,
    errors: diagnostics.map(d => ({
      file: d.file?.fileName || 'unknown',
      line: d.start ? d.file!.getLineAndCharacterOfPosition(d.start).line : -1,
      message: ts.flattenDiagnosticMessageText(d.messageText, '\n')
    }))
  };
}
```

### Layer 3: Build Verification (Comprehensive)
```bash
#!/bin/bash
# validation-build.sh

echo "🔨 Running full TypeScript build..."
npm run build

if [ $? -ne 0 ]; then
  echo "❌ Build failed - transformation issues detected"
  exit 1
fi

echo "✅ Build successful"
exit 0
```

### Layer 4: Unit Test Execution (Thorough)
```typescript
async function runUnitTests(): Promise<ValidationResult> {
  const { execSync } = require('child_process');
  
  try {
    const output = execSync('npm run test:unit', {
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    
    return {
      passed: true,
      output,
      testsRun: extractTestCount(output),
      testsPassed: extractPassCount(output)
    };
  } catch (error) {
    return {
      passed: false,
      output: error.stdout + error.stderr,
      error: error.message
    };
  }
}
```

## Validation Workflow

### Sequential Validation Strategy
```typescript
async function validateTransformation(
  files: string[],
  projectRoot: string
): Promise<ComprehensiveValidationResult> {
  
  // Step 1: Syntax (fastest - fail fast)
  console.log('1/4 Validating syntax...');
  const syntaxResult = await validateSyntax(files);
  if (!syntaxResult.passed) {
    return {
      stage: 'syntax',
      passed: false,
      details: syntaxResult,
      recommendation: 'Rollback transformation - syntax errors detected'
    };
  }
  
  // Step 2: Type checking (fast)
  console.log('2/4 Validating types...');
  const typeResult = await validateTypes(projectRoot);
  if (!typeResult.passed) {
    return {
      stage: 'types',
      passed: false,
      details: typeResult,
      recommendation: 'Rollback transformation - type errors detected'
    };
  }
  
  // Step 3: Build (moderate speed)
  console.log('3/4 Running build...');
  const buildResult = await runBuild(projectRoot);
  if (!buildResult.passed) {
    return {
      stage: 'build',
      passed: false,
      details: buildResult,
      recommendation: 'Rollback transformation - build failed'
    };
  }
  
  // Step 4: Unit tests (thorough)
  console.log('4/4 Running unit tests...');
  const testResult = await runUnitTests();
  if (!testResult.passed) {
    return {
      stage: 'tests',
      passed: false,
      details: testResult,
      recommendation: 'Review test failures - may be unrelated to transformation'
    };
  }
  
  return {
    stage: 'complete',
    passed: true,
    message: '✅ All validation layers passed'
  };
}
```

## Validation Report Format

### Success Report
```json
{
  "validationStatus": "passed",
  "timestamp": "2026-02-05T13:28:00Z",
  "duration": "45s",
  "layers": {
    "syntax": {
      "passed": true,
      "filesChecked": 28,
      "duration": "2s"
    },
    "types": {
      "passed": true,
      "filesChecked": 28,
      "duration": "8s"
    },
    "build": {
      "passed": true,
      "duration": "25s"
    },
    "tests": {
      "passed": true,
      "testsRun": 156,
      "testsPassed": 156,
      "duration": "10s"
    }
  },
  "recommendation": "Safe to commit transformation"
}
```

### Failure Report
```json
{
  "validationStatus": "failed",
  "failedStage": "types",
  "timestamp": "2026-02-05T13:30:00Z",
  "duration": "12s",
  "errors": [
    {
      "file": "src/services/lead-service.ts",
      "line": 45,
      "message": "Type '{ leadId: string; }' is not assignable to parameter of type 'string'",
      "severity": "error"
    }
  ],
  "recommendation": "Rollback transformation - type errors detected",
  "rollbackCommand": "npm run rollback:logger-fix"
}
```

## Rollback Triggers

### Automatic Rollback Conditions
- ❌ Syntax errors in any transformed file
- ❌ Type checking fails
- ❌ Build fails
- ⚠️ >10% of unit tests fail (manual review)

### Rollback Execution
```typescript
async function executeRollback(
  backupLocation: string,
  files: string[]
): Promise<RollbackResult> {
  console.log('🔄 Initiating rollback...');
  
  const results = await Promise.all(
    files.map(async file => {
      const backupPath = path.join(backupLocation, file + '.backup');
      const backupExists = await fs.pathExists(backupPath);
      
      if (!backupExists) {
        return { file, status: 'no-backup', restored: false };
      }
      
      await fs.copy(backupPath, file, { overwrite: true });
      return { file, status: 'restored', restored: true };
    })
  );
  
  const allRestored = results.every(r => r.restored);
  
  if (allRestored) {
    console.log('✅ Rollback successful - all files restored');
  } else {
    console.error('❌ Partial rollback - some files missing backups');
  }
  
  return {
    success: allRestored,
    filesRestored: results.filter(r => r.restored).length,
    filesFailed: results.filter(r => !r.restored).length,
    details: results
  };
}
```

## Differential Validation

### Compare Before/After
```typescript
async function validateDifferences(
  originalFile: string,
  transformedFile: string
): Promise<DiffValidation> {
  
  const original = await fs.readFile(originalFile, 'utf-8');
  const transformed = await fs.readFile(transformedFile, 'utf-8');
  
  // Parse both files
  const originalAST = parseTypeScript(original);
  const transformedAST = parseTypeScript(transformed);
  
  // Count logger calls
  const originalLoggerCalls = countLoggerCalls(originalAST);
  const transformedLoggerCalls = countLoggerCalls(transformedAST);
  
  // Validate transformation didn't add/remove calls
  if (originalLoggerCalls !== transformedLoggerCalls) {
    return {
      valid: false,
      reason: 'Logger call count mismatch',
      original: originalLoggerCalls,
      transformed: transformedLoggerCalls
    };
  }
  
  // Validate only logger calls changed
  const nonLoggerChanges = detectNonLoggerChanges(originalAST, transformedAST);
  if (nonLoggerChanges.length > 0) {
    return {
      valid: false,
      reason: 'Unexpected changes detected outside logger calls',
      changes: nonLoggerChanges
    };
  }
  
  return {
    valid: true,
    loggerCallsTransformed: transformedLoggerCalls
  };
}
```

## Usage in Agent Workflow
```typescript
// Agent validates after transformation
const validationResult = await skills.validateTransformation({
  files: transformResult.modifiedFiles,
  projectRoot: './RE-Engine',
  backupLocation: transformResult.summary.backupLocation,
  autoRollback: true
});

if (validationResult.passed) {
  console.log('✅ Transformation validated successfully');
  console.log('Safe to commit changes');
} else {
  console.log(`❌ Validation failed at stage: ${validationResult.stage}`);
  if (validationResult.rollback?.success) {
    console.log('✅ Rollback completed successfully');
  }
}
```

## When to Use This Skill
- ✅ After every code transformation
- ✅ Before committing changes
- ✅ As part of CI/CD pipeline
- ✅ After automated refactoring

## Never Do This
- ❌ Skip validation after transformation
- ❌ Commit changes without validation
- ❌ Ignore validation failures
- ❌ Skip rollback when validation fails
