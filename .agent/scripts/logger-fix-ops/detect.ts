import * as fs from 'fs';
import * as path from 'path';

// Configuration
const CONFIG = {
    rootDir: process.argv[2] || './src',
    extensions: ['.ts', '.tsx'],
    excludeDirs: ['node_modules', 'dist', 'coverage', '.git', '.agent'],
    reportFormat: 'json',
    outputFile: process.argv[3] || 'detection-report.json'
};

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

interface DetectionSummary {
    totalFiles: number;
    totalIssues: number;
    filesWithIssues: Array<{
        path: string;
        issueCount: number;
        lines: number[];
    }>;
}

interface DetectionReport {
    summary: DetectionSummary;
    issues: LoggerIssue[];
}

function walkDir(dir: string, callback: (filePath: string) => void) {
    if (!fs.existsSync(dir)) return;

    const files = fs.readdirSync(dir);
    for (const f of files) {
        const dirPath = path.join(dir, f);
        const isDirectory = fs.statSync(dirPath).isDirectory();

        if (CONFIG.excludeDirs.includes(f)) {
            continue;
        }

        if (isDirectory) {
            walkDir(dirPath, callback);
        } else {
            const ext = path.extname(f);
            if (CONFIG.extensions.includes(ext)) {
                callback(dirPath);
            }
        }
    }
}

// Regex from SKILL.md
// logger\.(info|error|warn|debug|fatal)\s*\(\s*(["`'])([^"`']*)\2\s*,\s*(\{[^}]*\})\s*\)
// Note: We need to handle the regex carefully in string format
const LOGGER_REGEX = /logger\.(info|error|warn|debug|fatal)\s*\(\s*(["'`])((?:(?!\2).)*)\2\s*,\s*(\{[\s\S]*?\})\s*\)/g;

function detectIssues(): DetectionReport {
    const report: DetectionReport = {
        summary: {
            totalFiles: 0,
            totalIssues: 0,
            filesWithIssues: []
        },
        issues: []
    };

    console.log(`Scanning directory: ${CONFIG.rootDir}`);

    walkDir(CONFIG.rootDir, (filePath) => {
        report.summary.totalFiles++;

        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const lines = content.split('\n');
            let match;
            let fileIssues = 0;
            const issueLines: number[] = [];

            // Reset regex state
            LOGGER_REGEX.lastIndex = 0;

            while ((match = LOGGER_REGEX.exec(content)) !== null) {
                // Determine line number
                const index = match.index;
                const lineNum = content.substring(0, index).split('\n').length;
                const column = index - content.lastIndexOf('\n', index);
                const fullMatch = match[0];

                const method = match[1] as any;
                // match[2] is quote
                const message = match[3];
                const dataObject = match[4];

                // Check if it's already correct (this regex targets specifically the incorrect pattern "message", {data})
                // If the regex matched, it captured "string", {object}.
                // Correct pattern is {object}, "string".
                // So any match is likely an issue unless it's a false positive.

                // Simple validation to check if dataObject looks like an object
                if (!dataObject.trim().startsWith('{')) continue;

                const issue: LoggerIssue = {
                    file: filePath,
                    line: lineNum,
                    column: column,
                    method: method,
                    currentCode: fullMatch,
                    message: message,
                    dataObject: dataObject,
                    severity: 'high',
                    fixable: true
                };

                report.issues.push(issue);
                fileIssues++;
                issueLines.push(lineNum);
            }

            if (fileIssues > 0) {
                report.summary.filesWithIssues.push({
                    path: filePath,
                    issueCount: fileIssues,
                    lines: issueLines
                });
                report.summary.totalIssues += fileIssues;
            }

        } catch (err) {
            console.error(`Error processing file ${filePath}:`, err);
        }
    });

    return report;
}

const result = detectIssues();
fs.writeFileSync(CONFIG.outputFile, JSON.stringify(result, null, 2));

console.log(`Detection complete.`);
console.log(`Total Files Scanned: ${result.summary.totalFiles}`);
console.log(`Issues Found: ${result.summary.totalIssues}`);
console.log(`Report written to: ${CONFIG.outputFile}`);
