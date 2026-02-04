/**
 * Orchestration System Test
 * Tests all orchestration components working together
 */

import { MasterOrchestrator } from './master-orchestrator';
import { ComponentManager } from './component-manager';
import { IntelligentModelSelector } from './intelligent-model-selector';
import { FallbackManager } from './fallback-manager';
import { GuardrailSystem } from './guardrail-system';
import { ResourceManager } from './resource-manager';
import { PerformanceMonitor } from './performance-monitor';
import { Logger } from '../utils/logger';

/**
 * Test the complete orchestration system
 */
export async function testOrchestrationSystem(): Promise<void> {
  const logger = new Logger('OrchestrationTest', true);
  
  logger.info('🧪 Starting Orchestration System Test...');

  try {
    // Test 1: Component Manager
    await testComponentManager();
    
    // Test 2: Model Selector
    await testModelSelector();
    
    // Test 3: Fallback Manager
    await testFallbackManager();
    
    // Test 4: Guardrail System
    await testGuardrailSystem();
    
    // Test 5: Resource Manager
    await testResourceManager();
    
    // Test 6: Performance Monitor
    await testPerformanceMonitor();
    
    // Test 7: Master Orchestrator Integration
    await testMasterOrchestrator();
    
    logger.info('✅ All Orchestration Tests Passed!');
    
  } catch (error) {
    logger.error('❌ Orchestration Test Failed:', error);
    throw error;
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
 * Test Model Selector
 */
async function testModelSelector(): Promise<void> {
  const logger = new Logger('ModelSelectorTest', true);
  
  logger.info('🧪 Testing Model Selector...');

  const modelSelector = new IntelligentModelSelector();
  
  // Test model initialization (mock)
  try {
    // This would normally initialize real models
    // await modelSelector.initializeLocalModel('llama3.1:8b');
    logger.info('📝 Model initialization test skipped (requires Ollama)');
  } catch (error) {
    logger.info('📝 Model initialization test failed as expected (no Ollama running)');
  }
  
  // Test model selection logic
  const mockModels = [
    {
      id: 'test-model-1',
      name: 'llama3.1:8b',
      type: 'local' as const,
      provider: 'ollama',
      contextWindow: 128000,
      costPerToken: 0,
      isLocal: true,
      capabilities: ['text', 'reasoning'],
      performance: { latency: 1000, accuracy: 0.85, reliability: 0.9, errorRate: 0.1, lastUpdated: Date.now() }
    }
  ];
  
  // Mock the models map
  (modelSelector as any).models.set('test-model-1', mockModels[0]);
  
  // Test model ranking
  const rankedModels = await (modelSelector as any).rankModels(mockModels, 'lead_analysis', {
    minContextWindow: 4096,
    maxCostPerToken: 0.01
  });
  
  if (rankedModels.length === 0) {
    throw new Error('Model ranking failed');
  }
  
  logger.info('✅ Model Selector Test Passed');
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
    },
    {
      type: 'parameter-adjustment',
      adjustments: { timeout: 60000 },
      priority: 2
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
  
  // Test circuit breaker status
  const circuitBreakerStatus = fallbackManager.getCircuitBreakerStatus();
  
  if (!circuitBreakerStatus) {
    throw new Error('Failed to get circuit breaker status');
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
    retryPolicy: { maxAttempts: 3, baseDelay: 1000, maxDelay: 30000, backoff: 'exponential' },
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
  
  // Test step validation
  const step = {
    id: 'test-step',
    name: 'Test Step',
    type: 'llm' as const,
    component: 'test-component',
    action: 'test-action',
    parameters: { test: 'data' },
    dependencies: [],
    guardrails: ['no-sensitive-data-exposure'],
    timeout: 30000,
    retryPolicy: { maxAttempts: 3, baseDelay: 1000, maxDelay: 30000, backoff: 'exponential' },
    fallbacks: []
  };
  
  const stepValidationResult = await guardrailSystem.validateStep(step, context);
  
  if (!stepValidationResult.compliant) {
    throw new Error('Step validation failed');
  }
  
  // Test rule management
  const rules = guardrailSystem.getRules();
  
  if (rules.size === 0) {
    throw new Error('No rules found');
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
  
  // Test workflow performance
  const workflowPerformance = performanceMonitor.getWorkflowPerformance('test-workflow');
  
  if (!workflowPerformance) {
    throw new Error('Failed to get workflow performance');
  }
  
  // Test component performance
  const componentPerformance = performanceMonitor.getComponentPerformance('test-component');
  
  if (!componentPerformance) {
    throw new Error('Failed to get component performance');
  }
  
  // Test shutdown
  performanceMonitor.shutdown();
  
  logger.info('✅ Performance Monitor Test Passed');
}

/**
 * Test Master Orchestrator Integration
 */
async function testMasterOrchestrator(): Promise<void> {
  const logger = new Logger('MasterOrchestratorTest', true);
  
  logger.info('🧪 Testing Master Orchestrator Integration...');

  const orchestrator = new MasterOrchestrator({
    maxConcurrentWorkflows: 5,
    defaultTimeout: 60000,
    healthCheckInterval: 30000,
    enableAutoScaling: true,
    enableDetailedLogging: true
  });
  
  // Test initialization
  await orchestrator.initialize();
  
  // Test component access
  const component = orchestrator.getComponent('database');
  
  if (!component) {
    throw new Error('Failed to get component');
  }
  
  // Test health status
  const healthStatus = await orchestrator.getHealthStatus();
  
  if (!healthStatus) {
    throw new Error('Failed to get health status');
  }
  
  // Test shutdown
  await orchestrator.shutdown();
  
  logger.info('✅ Master Orchestrator Integration Test Passed');
}

// Export the main test function
export { testOrchestrationSystem as runTests };
