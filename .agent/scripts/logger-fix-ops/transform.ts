import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

// Configuration
const CONFIG = {
    reportFile: process.argv[2] || 'detection-report.json',
    backupDir: process.argv[3] || './.backups',
    dryRun: process.argv.includes('--dry-run')
};

interface DetectionReport {
    summary: {
        filesWithIssues: Array<{ path: string; issueCount: number; }>;
    };
}

function getSourceFile(filePath: string): ts.SourceFile {
    const content = fs.readFileSync(filePath, 'utf-8');
    return ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
}

function isLoggerCall(node: ts.Node): boolean {
    if (!ts.isCallExpression(node)) return false;

    const expr = node.expression;
    if (!ts.isPropertyAccessExpression(expr)) return false;

    // Check for logger.method
    if (expr.expression.getText(node.getSourceFile()) !== 'logger') return false;

    const method = expr.name.getText(node.getSourceFile());
    return ['info', 'error', 'warn', 'debug', 'fatal'].includes(method);
}

interface Replacement {
    start: number;
    end: number;
    newText: string;
}

function processFile(filePath: string): number {
    console.log(`Processing ${filePath}...`);

    let content = fs.readFileSync(filePath, 'utf-8');
    const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);

    const replacements: Replacement[] = [];

    function visit(node: ts.Node) {
        if (isLoggerCall(node)) {
            const callExpr = node as ts.CallExpression;
            const args = callExpr.arguments;

            if (args.length >= 2) {
                const arg1 = args[0];
                const arg2 = args[1];

                // Check if arg1 is string-like and arg2 is object-like


                // Explicit SyntaxKind checks
                const isArg1String =
                    arg1.kind === ts.SyntaxKind.StringLiteral ||
                    arg1.kind === ts.SyntaxKind.TemplateExpression ||
                    arg1.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral;

                const isArg2Object = arg2.kind === ts.SyntaxKind.ObjectLiteralExpression;

                if (isArg1String && isArg2Object) {
                    // This is the pattern to fix: (message, data) -> (data, message)
                    const arg1Text = arg1.getText(sourceFile);
                    const arg2Text = arg2.getText(sourceFile);
                    const newArgsText = `${arg2Text}, ${arg1Text}`;
                    const start = arg1.getStart(sourceFile);
                    const end = arg2.getEnd();
                    replacements.push({
                        start,
                        end,
                        newText: newArgsText
                    });
                } else {
                    const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
                    if (!isArg1String && isArg2Object) {
                        // Check if it's already fixed?
                        // console.log(`Debug: Line ${line}: Arg1=${ts.SyntaxKind[arg1.kind]}, Arg2=${ts.SyntaxKind[arg2.kind]}`);
                    } else if (isArg1String && !isArg2Object) {
                        // console.log(`Debug: Line ${line}: Arg1=${ts.SyntaxKind[arg1.kind]}, Arg2=${ts.SyntaxKind[arg2.kind]}`);
                    } else {
                        // console.log(`Debug: Line ${line}: Arg1=${ts.SyntaxKind[arg1.kind]}, Arg2=${ts.SyntaxKind[arg2.kind]}`);
                    }
                }
            } else {
                const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
                console.log(`Skipping call at line ${line}: Less than 2 args (${args.length})`);
            }
        }
        ts.forEachChild(node, visit);
    }

    visit(sourceFile);

    if (replacements.length === 0) {
        console.log(`  No transformations needed.`);
        return 0;
    }

    // Apply replacements in reverse order
    replacements.sort((a, b) => b.start - a.start);

    let newContent = content;
    for (const r of replacements) {
        newContent = newContent.substring(0, r.start) + r.newText + newContent.substring(r.end);
    }

    if (!CONFIG.dryRun) {
        // Backup first
        const backupPath = path.join(CONFIG.backupDir, filePath);
        fs.mkdirSync(path.dirname(backupPath), { recursive: true });
        fs.copyFileSync(filePath, backupPath);

        // Write new content
        fs.writeFileSync(filePath, newContent, 'utf-8');
        console.log(`  Fixed ${replacements.length} calls.`);
    } else {
        console.log(`  [Dry Run] Would fix ${replacements.length} calls.`);
    }

    return replacements.length;
}

function run() {
    if (!fs.existsSync(CONFIG.reportFile)) {
        console.error(`Report file not found: ${CONFIG.reportFile}`);
        process.exit(1);
    }

    const report: DetectionReport = JSON.parse(fs.readFileSync(CONFIG.reportFile, 'utf-8'));

    // Ensure backup dir exists
    if (!CONFIG.dryRun) {
        fs.mkdirSync(CONFIG.backupDir, { recursive: true });
    }

    let totalFixed = 0;
    for (const file of report.summary.filesWithIssues) {
        try {
            totalFixed += processFile(file.path);
        } catch (err) {
            console.error(`Failed to process ${file.path}:`, err);
        }
    }

    console.log(`Transformation complete.`);
    console.log(`Total calls fixed: ${totalFixed}`);
}

run();
