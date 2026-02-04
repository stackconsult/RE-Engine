/**
 * Simple Test Runner for Orchestration Components
 */

import { ComponentManager } from './component-manager';
import { IntelligentModelSelector } from './intelligent-model-selector';
import { FallbackManager } from './fallback-manager';
import { GuardrailSystem } from './guardrail-system';
import { ResourceManager } from './resource-manager';
import { PerformanceMonitor } from './performance-monitor';
import { Logger } from '../utils/logger';

/**
 * Run basic tests to verify orchestration components
 */
export async function runBasicTests(): Promise<boolean> {
  const logger = new Logger('TestRunner', true);
  
  logger.info('🧪 Starting Basic Orchestration Tests...');

  try {
    // Test 1: Component Manager
    await testComponentManager();
    
    // Test 2: Fallback Manager
    await testFallbackManager();
    
    // Test 3: Guardrail System
    await testGuardrailSystem();
    
    // Test 4: Resource Manager
    await testResourceManager();
    
    // Test 5: Performance Monitor
    await testPerformanceMonitor();
    
    logger.info('✅ All Basic Tests Passed!');
    return true;
    
  } catch (error) {
    logger.error('❌ Basic Tests Failed:', error);
    return false;
  }
}

/**
 * Test Component Manager
 */
async function testComponentManager(): Promise<void> {
  const logger = new Logger('ComponentManagerTest', true);
  
  logger.info('🧪 Testing Component Manager...');

  const componentManager = new ComponentManager();
  
  // Test component initialization
  const databaseComponent = await componentManager.initializeComponent('database', {
    type: 'database',
    primary: 'supabase',
    fallback: 'postgresql'
  });
  
  if (!databaseComponent) {
    throw new Error('Failed to initialize database component');
  }
  
  // Test component execution
  const result = await databaseComponent.execute('insert', { table: 'test', data: { id: 1 } });
  
  if (!result.success) {
    throw new Error('Component execution failed');
  }
  
  // Test health status
  const healthStatus = await componentManager.getHealthStatus();
  
  if (!healthStatus) {
    throw new Error('Failed to get health status');
  }
  
  // Test communication channels
  componentManager.establishChannels();
  
  // Test shutdown
  await componentManager.shutdown();
  
  logger.info('✅ Component Manager Test Passed');
}

/**
 * Test Fallback Manager
 */
async function testFallbackManager(): Promise<void> {
  const logger = new Logger('FallbackManagerTest', true);
  
  logger.info('🧪 Testing Fallback Manager...');

  const fallbackManager = new FallbackManager();
  
  // Test strategy registration
  fallbackManager.registerStrategies('test-workflow', [
    {
      type: 'component-replacement',
      replacementComponent: 'fallback-component',
      priority: 1
    }
  ]);
  
  // Test failure handling
  const failure = {
    workflowId: 'test-workflow',
    stepId: 'test-step',
    error: 'Test error',
    context: { workflowId: 'test-workflow', startTime: Date.now(), orchestratorId: 'test', traceId: 'test' },
    timestamp: Date.now(),
    severity: 'medium' as const
  };
  
  const recoveryResult = await fallbackManager.handleFailure(failure);
  
  if (!recoveryResult.success) {
    throw new Error('Fallback recovery failed');
  }
  
  logger.info('✅ Fallback Manager Test Passed');
}

/**
 * Test Guardrail System
 */
async function testGuardrailSystem(): Promise<void> {
  const logger = new Logger('GuardrailSystemTest', true);
  
  logger.info('🧪 Testing Guardrail System...');

  const guardrailSystem = new GuardrailSystem();
  
  // Test initialization
  await guardrailSystem.initialize({
    rules: ['no-sensitive-data-exposure', 'no-unauthorized-access'],
    enforcement: 'strict',
    logging: true,
    alerts: true
  });
  
  // Test workflow validation
  const workflow = {
    id: 'test-workflow',
    name: 'Test Workflow',
    description: 'Test workflow for validation',
    steps: [],
    triggers: [],
    guardrails: ['no-sensitive-data-exposure'],
    fallbacks: [],
    retryPolicy: { maxAttempts: 3, baseDelay: 1000, maxDelay: 30000, backoff: 'exponential' as const },
    timeout: 60000
  };
  
  const context = {
    workflowId: 'test-workflow',
    startTime: Date.now(),
    orchestratorId: 'test',
    traceId: 'test'
  };
  
  const validationResult = await guardrailSystem.validateWorkflow(workflow, context);
  
  if (!validationResult.compliant) {
    throw new Error('Workflow validation failed');
  }
  
  logger.info('✅ Guardrail System Test Passed');
}

/**
 * Test Resource Manager
 */
async function testResourceManager(): Promise<void> {
  const logger = new Logger('ResourceManagerTest', true);
  
  logger.info('🧪 Testing Resource Manager...');

  const resourceManager = new ResourceManager({
    enableAutoScaling: true,
    maxResources: {
      maxCPU: 50,
      maxMemory: 8192,
      maxStorage: 512000,
      maxNetwork: 5000,
      maxGPU: 4
    },
    scalingThresholds: {
      cpuThreshold: 80,
      memoryThreshold: 85,
      scaleUpDelay: 30000,
      scaleDownDelay: 120000
    },
    loadBalancingStrategy: 'least-connections'
  });
  
  // Test resource allocation
  const requirements = {
    cpu: 2,
    memory: 1024,
    storage: 1000,
    network: 100,
    gpu: 0
  };
  
  const allocation = await resourceManager.allocateResources(requirements);
  
  if (!allocation || allocation.resources.length === 0) {
    throw new Error('Resource allocation failed');
  }
  
  // Test resource release
  await resourceManager.releaseResources(allocation);
  
  // Test system resources
  const systemResources = resourceManager.getSystemResources();
  
  if (!systemResources) {
    throw new Error('Failed to get system resources');
  }
  
  // Test health status
  const healthStatus = await resourceManager.getHealthStatus();
  
  if (!healthStatus) {
    throw new Error('Failed to get health status');
  }
  
  // Test shutdown
  await resourceManager.shutdown();
  
  logger.info('✅ Resource Manager Test Passed');
}

/**
 * Test Performance Monitor
 */
async function testPerformanceMonitor(): Promise<void> {
  const logger = new Logger('PerformanceMonitorTest', true);
  
  logger.info('🧪 Testing Performance Monitor...');

  const performanceMonitor = new PerformanceMonitor();
  
  // Test performance recording
  const performanceData = {
    timestamp: Date.now(),
    workflowId: 'test-workflow',
    component: 'test-component',
    action: 'test-action',
    duration: 1000,
    success: true
  };
  
  performanceMonitor.recordPerformance(performanceData);
  
  // Test metrics retrieval
  const metrics = performanceMonitor.getMetrics();
  
  if (!metrics) {
    throw new Error('Failed to get metrics');
  }
  
  // Test performance data retrieval
  const data = performanceMonitor.getPerformanceData();
  
  if (data.length === 0) {
    throw new Error('No performance data found');
  }
  
  // Test shutdown
  performanceMonitor.shutdown();
  
  logger.info('✅ Performance Monitor Test Passed');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runBasicTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}
