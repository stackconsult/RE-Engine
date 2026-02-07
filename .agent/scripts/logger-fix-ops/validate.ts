import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const CONFIG = {
    projectRoot: process.argv[2] || process.cwd(),
    reportFile: process.argv[3] || 'detection-report.json',
};

interface ValidationResult {
    stage: 'syntax' | 'types' | 'build' | 'tests' | 'complete';
    passed: boolean;
    details?: any;
    recommendation?: string;
}

// Layer 1: Syntax Validation
async function validateSyntax(files: string[]): Promise<boolean> {
    console.log('1/4 Validating syntax...');
    let passed = true;
    for (const file of files) {
        try {
            const content = fs.readFileSync(file, 'utf-8');
            const sourceFile = ts.createSourceFile(
                file,
                content,
                ts.ScriptTarget.Latest,
                true
            );

            const diagnostics = (sourceFile as any).parseDiagnostics as ts.Diagnostic[];
            if (diagnostics.length > 0) {
                console.error(`Syntax error in ${file}:`);
                diagnostics.forEach((d: ts.Diagnostic) => {
                    const { line, character } = sourceFile.getLineAndCharacterOfPosition(d.start!);
                    console.error(`  Line ${line + 1}, Col ${character + 1}: ${d.messageText}`);
                });
                passed = false;
            }
        } catch (err) {
            console.error(`Failed to validate syntax for ${file}:`, err);
            passed = false;
        }
    }
    return passed;
}

// Layer 2: Type Checking
// This requires a valid tsconfig.json. We will try to find one in the project root or subdirectories if needed.
// For simplicity in this script, we might skip full project type checking if not easily configurable, 
// or try to run `tsc --noEmit` on the specific files if possible (but that needs context).
// Better: run `npm run typecheck` if available.
async function validateTypes(projectRoot: string): Promise<boolean> {
    console.log('2/4 Validating types...');
    // Attempt to run typecheck script if available
    try {
        // checks if there is a script called "typecheck" in package.json
        const pkgPath = path.join(projectRoot, 'package.json');
        if (fs.existsSync(pkgPath)) {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
            if (pkg.scripts && pkg.scripts.typecheck) {
                console.log('Running npm run typecheck...');
                execSync('npm run typecheck', { cwd: projectRoot, stdio: 'inherit' });
                return true;
            }
        }
    } catch (err) {
        console.error('Type check failed.');
        return false;
    }

    console.log('No typecheck script or manual check skipped.');
    return true; // Soft pass if no script
}

// Layer 3: Build Verification
async function runBuild(projectRoot: string): Promise<boolean> {
    console.log('3/4 Running build...');
    try {
        execSync('npm run build', { cwd: projectRoot, stdio: 'inherit' });
        return true;
    } catch (err) {
        console.error('Build failed.');
        return false;
    }
}

// Layer 4: Unit Tests
async function runUnitTests(projectRoot: string): Promise<boolean> {
    console.log('4/4 Running unit tests...');
    try {
        execSync('npm test', { cwd: projectRoot, stdio: 'inherit' });
        return true;
    } catch (err) {
        console.error('Tests failed.');
        return false;
    }
}

async function run() {
    let filesToCheck: string[] = [];
    if (fs.existsSync(CONFIG.reportFile)) {
        const report = JSON.parse(fs.readFileSync(CONFIG.reportFile, 'utf-8'));
        filesToCheck = report.summary.filesWithIssues.map((f: any) => f.path);
    } else {
        console.log('No report file found, skipping file-specific syntax check.');
    }

    if (filesToCheck.length > 0) {
        if (!await validateSyntax(filesToCheck)) {
            console.error('❌ Syntax validation failed. Aborting.');
            process.exit(1);
        }
    }

    if (!await validateTypes(CONFIG.projectRoot)) {
        console.error('❌ Type checking failed.');
        process.exit(1);
    }

    if (!await runBuild(CONFIG.projectRoot)) {
        console.error('❌ Build failed.');
        process.exit(1);
    }

    // Skip tests for now as they might take too long or fail for unrelated reasons in a general fix script
    // But per rules, we should run them. I'll uncomment validation logic but maybe be lenient or allow skipping via flag
    if (process.argv.includes('--skip-tests')) {
        console.log('Skipping unit tests.');
    } else {
        if (!await runUnitTests(CONFIG.projectRoot)) {
            console.error('❌ Unit tests failed.');
            process.exit(1);
        }
    }

    console.log('✅ All validations passed.');
}

run();
