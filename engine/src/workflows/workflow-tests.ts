/**
 * Workflow Tests
 * Comprehensive testing for real estate workflows
 */

import { WorkflowService, WorkflowTemplateService } from '../services/workflow-service';
import { MasterOrchestrator } from '../orchestration/master-orchestrator';
import { Logger } from '../utils/logger';

/**
 * Test real estate workflows
 */
export async function testRealEstateWorkflows(): Promise<boolean> {
  const logger = new Logger('WorkflowTests', true);
  
  logger.info('🧪 Starting Real Estate Workflow Tests...');

  try {
    // Initialize orchestrator
    const orchestrator = new MasterOrchestrator({
      maxConcurrentWorkflows: 5,
      defaultTimeout: 300000,
      healthCheckInterval: 30000,
      enableAutoScaling: false,
      enableDetailedLogging: true
    });

    await orchestrator.initialize();

    // Initialize workflow service
    const workflowService = new WorkflowService(orchestrator, {
      defaultTimeout: 300000,
      maxConcurrentWorkflows: 3,
      enableDetailedLogging: true,
      enableAutoRetry: true
    });

    // Test 1: Lead Generation Workflow
    await testLeadGenerationWorkflow(workflowService);

    // Test 2: Market Analysis Workflow
    await testMarketAnalysisWorkflow(workflowService);

    // Test 3: Property Valuation Workflow
    await testPropertyValuationWorkflow(workflowService);

    // Test 4: Client Onboarding Workflow
    await testClientOnboardingWorkflow(workflowService);

    // Test 5: Workflow Registry
    await testWorkflowRegistry();

    // Test 6: Template Service
    await testTemplateService();

    // Cleanup
    await workflowService.shutdown();
    await orchestrator.shutdown();

    logger.info('✅ All Workflow Tests Passed!');
    return true;

  } catch (error) {
    logger.error('❌ Workflow Tests Failed:', error);
    return false;
  }
}

/**
 * Test Lead Generation Workflow
 */
async function testLeadGenerationWorkflow(workflowService: WorkflowService): Promise<void> {
  const logger = new Logger('LeadGenerationTest', true);
  
  logger.info('🧪 Testing Lead Generation Workflow...');

  // Create context
  const context = workflowTemplateService.createLeadGenerationContext({
    location: 'Austin, TX',
    propertyType: 'single-family',
    priceRange: { min: 300000, max: 500000 },
    bedrooms: 3,
    bathrooms: 2,
    userId: 'test-user'
  });

  // Test workflow availability
  const workflow = workflowService.getWorkflow('real-estate-lead-generation');
  
  if (!workflow) {
    throw new Error('Lead generation workflow not found');
  }

  // Test workflow structure
  if (workflow.steps.length === 0) {
    throw new Error('Lead generation workflow has no steps');
  }

  // Test step dependencies
  const firstStep = workflow.steps[0];
  if (firstStep.dependencies.length !== 0) {
    throw new Error('First step should have no dependencies');
  }

  // Test guardrails
  if (workflow.guardrails.length === 0) {
    throw new Error('Workflow should have guardrails');
  }

  // Test triggers
  if (workflow.triggers.length === 0) {
    throw new Error('Workflow should have triggers');
  }

  logger.info('✅ Lead Generation Workflow Test Passed');
}

/**
 * Test Market Analysis Workflow
 */
async function testMarketAnalysisWorkflow(workflowService: WorkflowService): Promise<void> {
  const logger = new Logger('MarketAnalysisTest', true);
  
  logger.info('🧪 Testing Market Analysis Workflow...');

  // Create context
  const context = workflowTemplateService.createMarketAnalysisContext({
    location: 'Denver, CO',
    timeRange: '6-months',
    audience: 'investor',
    userId: 'test-user'
  });

  // Test workflow availability
  const workflow = workflowService.getWorkflow('market-analysis');
  
  if (!workflow) {
    throw new Error('Market analysis workflow not found');
  }

  // Test workflow structure
  if (workflow.steps.length < 3) {
    throw new Error('Market analysis workflow should have at least 3 steps');
  }

  // Test step types
  const hasWebStep = workflow.steps.some(step => step.type === 'web');
  const hasLLMStep = workflow.steps.some(step => step.type === 'llm');
  const hasDatabaseStep = workflow.steps.some(step => step.type === 'database');

  if (!hasWebStep || !hasLLMStep || !hasDatabaseStep) {
    throw new Error('Market analysis workflow should include web, LLM, and database steps');
  }

  logger.info('✅ Market Analysis Workflow Test Passed');
}

/**
 * Test Property Valuation Workflow
 */
async function testPropertyValuationWorkflow(workflowService: WorkflowService): Promise<void> {
  const logger = new Logger('PropertyValuationTest', true);
  
  logger.info('🧪 Testing Property Valuation Workflow...');

  // Create context
  const context = workflowTemplateService.createPropertyValuationContext({
    propertyUrl: 'https://www.zillow.com/homedetails/123-test-street',
    valuationMethod: 'comparative',
    radius: 1,
    timeRange: '6-months',
    userId: 'test-user'
  });

  // Test workflow availability
  const workflow = workflowService.getWorkflow('property-valuation');
  
  if (!workflow) {
    throw new Error('Property valuation workflow not found');
  }

  // Test workflow structure
  if (workflow.steps.length < 4) {
    throw new Error('Property valuation workflow should have at least 4 steps');
  }

  // Test fallback strategies
  const hasFallbacks = workflow.steps.every(step => step.fallbacks.length > 0);
  
  if (!hasFallbacks) {
    throw new Error('All steps should have fallback strategies');
  }

  // Test retry policies
  const hasRetryPolicies = workflow.steps.every(step => step.retryPolicy);
  
  if (!hasRetryPolicies) {
    throw new Error('All steps should have retry policies');
  }

  logger.info('✅ Property Valuation Workflow Test Passed');
}

/**
 * Test Client Onboarding Workflow
 */
async function testClientOnboardingWorkflow(workflowService: WorkflowService): Promise<void> {
  const logger = new Logger('ClientOnboardingTest', true);
  
  logger.info('🧪 Testing Client Onboarding Workflow...');

  // Create context
  const context = workflowTemplateService.createClientOnboardingContext({
    clientInfo: {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1-555-0123',
      preferences: {
        propertyType: 'single-family',
        locations: ['Austin, TX', 'Denver, CO'],
        priceRange: { min: 400000, max: 600000 }
      }
    },
    preferences: {
      alerts: true,
      channels: ['email', 'sms'],
      frequency: 'weekly'
    },
    userId: 'test-user'
  });

  // Test workflow availability
  const workflow = workflowService.getWorkflow('client-onboarding');
  
  if (!workflow) {
    throw new Error('Client onboarding workflow not found');
  }

  // Test workflow structure
  if (workflow.steps.length < 4) {
    throw new Error('Client onboarding workflow should have at least 4 steps');
  }

  // Test step sequence
  const validationStep = workflow.steps.find(step => step.id === 'validate-client-info');
  const profileStep = workflow.steps.find(step => step.id === 'create-client-profile');
  const welcomeStep = workflow.steps.find(step => step.id === 'send-welcome');

  if (!validationStep || !profileStep || !welcomeStep) {
    throw new Error('Client onboarding workflow missing required steps');
  }

  // Test dependencies
  if (!welcomeStep.dependencies.includes('personalize-welcome')) {
    throw new Error('Welcome step should depend on personalization step');
  }

  logger.info('✅ Client Onboarding Workflow Test Passed');
}

/**
 * Test Workflow Registry
 */
async function testWorkflowRegistry(): Promise<void> {
  const logger = new Logger('WorkflowRegistryTest', true);
  
  logger.info('🧪 Testing Workflow Registry...');

  // Test workflow retrieval
  const allWorkflows = workflowService.getAvailableWorkflows();
  
  if (allWorkflows.length === 0) {
    throw new Error('No workflows found in registry');
  }

  // Test workflow categories
  const leadGenerationWorkflows = workflowService.getWorkflowsByCategory('lead-generation');
  const marketAnalysisWorkflows = workflowService.getWorkflowsByCategory('market-analysis');
  const valuationWorkflows = workflowService.getWorkflowsByCategory('valuation');

  if (leadGenerationWorkflows.length === 0) {
    throw new Error('No lead generation workflows found');
  }

  if (marketAnalysisWorkflows.length === 0) {
    throw new Error('No market analysis workflows found');
  }

  if (valuationWorkflows.length === 0) {
    throw new Error('No valuation workflows found');
  }

  // Test workflow uniqueness
  const workflowIds = allWorkflows.map(w => w.id);
  const uniqueIds = new Set(workflowIds);
  
  if (workflowIds.length !== uniqueIds.size) {
    throw new Error('Workflow IDs should be unique');
  }

  logger.info('✅ Workflow Registry Test Passed');
}

/**
 * Test Template Service
 */
async function testTemplateService(): Promise<void> {
  const logger = new Logger('TemplateServiceTest', true);
  
  logger.info('🧪 Testing Template Service...');

  // Test lead generation template
  const leadContext = workflowTemplateService.createLeadGenerationContext({
    location: 'Seattle, WA',
    propertyType: 'condo',
    priceRange: { min: 200000, max: 400000 },
    bedrooms: 2,
    bathrooms: 1
  });

  if (!leadContext.variables || !leadContext.variables.location) {
    throw new Error('Lead generation template missing required variables');
  }

  // Test market analysis template
  const marketContext = workflowTemplateService.createMarketAnalysisContext({
    location: 'Portland, OR',
    timeRange: '3-months',
    audience: 'buyer'
  });

  if (!marketContext.variables || !marketContext.variables.location) {
    throw new Error('Market analysis template missing required variables');
  }

  // Test property valuation template
  const valuationContext = workflowTemplateService.createPropertyValuationContext({
    propertyUrl: 'https://example.com/property/123',
    valuationMethod: 'automated'
  });

  if (!valuationContext.variables || !valuationContext.variables.propertyUrl) {
    throw new Error('Property valuation template missing required variables');
  }

  // Test client onboarding template
  const onboardingContext = workflowTemplateService.createClientOnboardingContext({
    clientInfo: {
      name: 'Jane Smith',
      email: 'jane@example.com'
    }
  });

  if (!onboardingContext.variables || !onboardingContext.variables.clientInfo) {
    throw new Error('Client onboarding template missing required variables');
  }

  logger.info('✅ Template Service Test Passed');
}

// Export the main test function
export { testRealEstateWorkflows as runWorkflowTests };

// Export template service for use in other modules
export { workflowTemplateService };
