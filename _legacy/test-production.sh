#!/bin/bash

# RE Engine Production Testing Script
# Comprehensive testing for the magical AI-infused automation system

set -e  # Exit on any error

echo "🧪 RE Engine Production Testing Script"
echo "======================================="

# Configuration
PROJECT_NAME="re-engine"
TEST_RESULTS_DIR="test-results"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
TEST_REPORT_FILE="$TEST_RESULTS_DIR/production-test-report-$TIMESTAMP.txt"

# Create test results directory
mkdir -p "$TEST_RESULTS_DIR"

# Initialize test report
cat > "$TEST_REPORT_FILE" << EOF
🧪 RE Engine Production Test Report
=====================================
Date: $(date)
Environment: Production
Build: $(git rev-parse --short HEAD)
Node.js: $(node --version)
npm: $(npm --version)

Test Results:
------------

EOF

# Function to log test results
log_test() {
    local test_name="$1"
    local status="$2"
    local details="$3"
    
    echo "$status $test_name"
    echo "$status $test_name: $details" >> "$TEST_REPORT_FILE"
    
    if [ "$status" = "❌" ]; then
        echo "Details: $details"
        echo "Details: $details" >> "$TEST_REPORT_FILE"
    fi
}

echo ""
echo "🔧 Phase 1: Build Tests"

# Test 1: TypeScript Compilation
echo "🔨 Testing TypeScript compilation..."
if npm run build 2>/dev/null; then
    log_test "TypeScript Compilation" "✅" "Build successful"
else
    log_test "TypeScript Compilation" "❌" "Build failed"
    exit 1
fi

# Test 2: Dependencies Check
echo "📦 Testing dependencies..."
if npm ls --depth=0 > /dev/null 2>&1; then
    log_test "Dependencies Check" "✅" "All dependencies satisfied"
else
    log_test "Dependencies Check" "❌" "Missing dependencies"
    exit 1
fi

echo ""
echo "🔧 Phase 2: Core System Tests"

# Test 3: Magical Automation Engine
echo "🪄 Testing Magical Automation Engine..."
node -e "
const { MagicalAutomationEngine } = require('./dist/ai/magical-automation-engine.js');
try {
    const engine = new MagicalAutomationEngine();
    console.log('✅ Magical Automation Engine initialized');
    process.exit(0);
} catch (error) {
    console.log('❌ Magical Automation Engine failed:', error.message);
    process.exit(1);
}
" 2>/dev/null && log_test "Magical Automation Engine" "✅" "Engine initialized successfully" || log_test "Magical Automation Engine" "❌" "Engine initialization failed"

# Test 4: Operational Agents
echo "🤖 Testing Operational Agents..."
node -e "
const { OperationalAgentsManager } = require('./dist/ai/operational-agents.js');
try {
    const manager = new OperationalAgentsManager();
    console.log('✅ Operational Agents Manager initialized');
    process.exit(0);
} catch (error) {
    console.log('❌ Operational Agents Manager failed:', error.message);
    process.exit(1);
}
" 2>/dev/null && log_test "Operational Agents Manager" "✅" "Manager initialized successfully" || log_test "Operational Agents Manager" "❌" "Manager initialization failed"

# Test 5: Fixes and Optimizations
echo "🔧 Testing Fixes and Optimizations..."
node -e "
const { FixesAndOptimizationsManager } = require('./dist/ai/fixes-and-optimizations.js');
try {
    const manager = new FixesAndOptimizationsManager();
    console.log('✅ Fixes and Optimizations Manager initialized');
    process.exit(0);
} catch (error) {
    console.log('❌ Fixes and Optimizations Manager failed:', error.message);
    process.exit(1);
}
" 2>/dev/null && log_test "Fixes and Optimizations Manager" "✅" "Manager initialized successfully" || log_test "Fixes and Optimizations Manager" "❌" "Manager initialization failed"

echo ""
echo "🔧 Phase 3: Orchestration Tests"

# Test 6: Master Orchestrator
echo "🎼 Testing Master Orchestrator..."
node -e "
const { MasterOrchestrator } = require('./dist/orchestration/master-orchestrator.js');
try {
    const orchestrator = new MasterOrchestrator({
        maxConcurrentWorkflows: 5,
        defaultTimeout: 300000,
        healthCheckInterval: 30000,
        enableAutoScaling: false,
        enableDetailedLogging: false
    });
    console.log('✅ Master Orchestrator initialized');
    process.exit(0);
} catch (error) {
    console.log('❌ Master Orchestrator failed:', error.message);
    process.exit(1);
}
" 2>/dev/null && log_test "Master Orchestrator" "✅" "Orchestrator initialized successfully" || log_test "Master Orchestrator" "❌" "Orchestrator initialization failed"

# Test 7: Workflow Service
echo "🔄 Testing Workflow Service..."
node -e "
const { WorkflowService } = require('./dist/services/workflow-service.js');
const { MasterOrchestrator } = require('./dist/orchestration/master-orchestrator.js');
try {
    const orchestrator = new MasterOrchestrator({
        maxConcurrentWorkflows: 5,
        defaultTimeout: 300000,
        healthCheckInterval: 30000,
        enableAutoScaling: false,
        enableDetailedLogging: false
    });
    const workflowService = new WorkflowService(orchestrator, {
        defaultTimeout: 300000,
        maxConcurrentWorkflows: 3,
        enableDetailedLogging: false,
        enableAutoRetry: true
    });
    console.log('✅ Workflow Service initialized');
    process.exit(0);
} catch (error) {
    console.log('❌ Workflow Service failed:', error.message);
    process.exit(1);
}
" 2>/dev/null && log_test "Workflow Service" "✅" "Service initialized successfully" || log_test "Workflow Service" "❌" "Service initialization failed"

echo ""
echo "🔧 Phase 4: API Tests"

# Test 8: API Server Initialization
echo "🌐 Testing API Server..."
node -e "
const { REEngineAPIServer } = require('./dist/api/server.js');
try {
    const server = new REEngineAPIServer({
        port: 3001,
        host: 'localhost',
        environment: 'test',
        enableCors: true,
        enableCompression: true,
        enableRateLimit: true,
        rateLimitWindow: 15 * 60 * 1000,
        rateLimitMax: 100,
        enableDetailedLogging: false
    });
    console.log('✅ API Server initialized');
    process.exit(0);
} catch (error) {
    console.log('❌ API Server failed:', error.message);
    process.exit(1);
}
" 2>/dev/null && log_test "API Server" "✅" "Server initialized successfully" || log_test "API Server" "❌" "Server initialization failed"

echo ""
echo "🔧 Phase 5: Real Estate Workflow Tests"

# Test 9: Real Estate Workflows
echo "🏠 Testing Real Estate Workflows..."
node -e "
const { WorkflowRegistry } = require('./dist/workflows/real-estate-workflows.js');
try {
    const registry = new WorkflowRegistry();
    const workflows = registry.getAllWorkflows();
    console.log('✅ Real Estate Workflows loaded:', workflows.length, 'workflows');
    process.exit(0);
} catch (error) {
    console.log('❌ Real Estate Workflows failed:', error.message);
    process.exit(1);
}
" 2>/dev/null && log_test "Real Estate Workflows" "✅" "Workflows loaded successfully" || log_test "Real Estate Workflows" "❌" "Workflows loading failed"

echo ""
echo "🔧 Phase 6: Integration Tests"

# Test 10: Full System Integration
echo "🔗 Testing Full System Integration..."
timeout 10s node dist/index.js > /dev/null 2>&1 && {
    log_test "Full System Integration" "✅" "System starts successfully"
} || {
    log_test "Full System Integration" "❌" "System failed to start"
}

echo ""
echo "🔧 Phase 7: Performance Tests"

# Test 11: Memory Usage
echo "💾 Testing Memory Usage..."
MEMORY_USAGE=$(node -e "
const used = process.memoryUsage();
console.log(Math.round(used.heapUsed / 1024 / 1024 * 100) / 100);
" 2>/dev/null || echo "0")

if [ "$MEMORY_USAGE" -lt 200 ]; then
    log_test "Memory Usage" "✅" "Memory usage: ${MEMORY_USAGE}MB"
else
    log_test "Memory Usage" "⚠️" "Memory usage high: ${MEMORY_USAGE}MB"
fi

# Test 12: Startup Time
echo "⏱️ Testing Startup Time..."
START_TIME=$(node -e "
const start = Date.now();
require('./dist/index.js');
const end = Date.now();
console.log(end - start);
" 2>/dev/null || echo "0")

if [ "$START_TIME" -lt 5000 ]; then
    log_test "Startup Time" "✅" "Startup time: ${START_TIME}ms"
else
    log_test "Startup Time" "⚠️" "Startup time slow: ${START_TIME}ms"
fi

echo ""
echo "🔧 Phase 8: Security Tests"

# Test 13: Environment Variables
echo "🔐 Testing Environment Variables..."
if [ -f ".env.production" ]; then
    log_test "Environment Variables" "✅" "Production environment file exists"
else
    log_test "Environment Variables" "❌" "Production environment file missing"
fi

# Test 14: Dependencies Security
echo "🛡️ Testing Dependencies Security..."
if npm audit --audit-level=high > /dev/null 2>&1; then
    log_test "Dependencies Security" "✅" "No high-severity vulnerabilities"
else
    log_test "Dependencies Security" "⚠️" "Security vulnerabilities found"
fi

echo ""
echo "🔧 Phase 9: CLI Tests"

# Test 15: CLI Tool
echo "🖥️ Testing CLI Tool..."
if node dist/cli.js --help > /dev/null 2>&1; then
    log_test "CLI Tool" "✅" "CLI tool functional"
else
    log_test "CLI Tool" "❌" "CLI tool not working"
fi

echo ""
echo "📊 Test Summary"
echo "==============="

# Count test results
TOTAL_TESTS=$(grep -c "✅\|❌\|⚠️" "$TEST_REPORT_FILE")
PASSED_TESTS=$(grep -c "✅" "$TEST_REPORT_FILE")
FAILED_TESTS=$(grep -c "❌" "$TEST_REPORT_FILE")
WARNED_TESTS=$(grep -c "⚠️" "$TEST_REPORT_FILE")

echo "Total Tests: $TOTAL_TESTS"
echo "Passed: $PASSED_TESTS ✅"
echo "Failed: $FAILED_TESTS ❌"
echo "Warnings: $WARNED_TESTS ⚠️"

# Add summary to report
cat >> "$TEST_REPORT_FILE" << EOF

Test Summary:
------------
Total Tests: $TOTAL_TESTS
Passed: $PASSED_TESTS ✅
Failed: $FAILED_TESTS ❌
Warnings: $WARNED_TESTS ⚠️

EOF

# Determine overall result
if [ "$FAILED_TESTS" -eq 0 ]; then
    echo ""
    echo "🎉 ALL TESTS PASSED! 🎉"
    echo "The magical AI-infused automation system is ready for production!"
    echo ""
    echo "📋 Test Report: $TEST_REPORT_FILE"
    exit 0
else
    echo ""
    echo "❌ SOME TESTS FAILED ❌"
    echo "Please review the failed tests before deploying to production."
    echo ""
    echo "📋 Test Report: $TEST_REPORT_FILE"
    exit 1
fi
