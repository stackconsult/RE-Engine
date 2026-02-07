
import { OrchestratorFactory } from '../orchestration/orchestrator-factory.js';
import { MasterOrchestrator } from '../orchestration/master-orchestrator.js';
import { OrchestratorDependencies, Workflow, Component, MasterOrchestratorConfig } from '../types/orchestration.types.js';
import { Logger } from '../utils/logger.js';
import { UnifiedDatabaseManager } from '../database/unified-database-manager.js';
import { HealthMonitor, SupabaseService, MessageQueue, PerformanceOptimizer } from '../production/types.js';

async function main() {
    const logger = new Logger('TestOrchestrator', true);
    logger.info('🚀 Starting Orchestrator Integration Test');

    // 1. Mock Dependencies
    const mockDependencies: OrchestratorDependencies = {
        logger: logger,
        db: {} as UnifiedDatabaseManager, // Casting as we won't use DB steps in this test
        healthMonitor: { recordHealth: () => { } } as unknown as HealthMonitor,
        supabase: {} as SupabaseService,
        messageQueue: {} as MessageQueue,
        performanceOptimizer: {} as PerformanceOptimizer
    };

    const config: MasterOrchestratorConfig = {
        maxConcurrentWorkflows: 5,
        defaultTimeout: 5000,
        healthCheckInterval: 60000,
        enableAutoScaling: false,
        enableDetailedLogging: true
    };

    // 2. Instantiate Orchestrator via Factory
    logger.info('Creating Orchestrator via Factory...');
    const orchestrator = OrchestratorFactory.create(config, mockDependencies);

    // 3. Register a Test Component
    const testComponent: Component = {
        name: 'echo-component',
        type: 'test',
        status: 'healthy',
        execute: async (action, params) => {
            logger.info(`Component executing action: ${action}`, params);
            return { echo: params, timestamp: Date.now() };
        }
    };

    // We need to access componentManager directly or expose a register method on Orchestrator
    // MasterOrchestrator has registerComponent? Let's check.
    // If not, we might need to access it via public getter if available, or just cast to any.
    // Checking MasterOrchestrator source (from memory/previous steps), it likely delegated to ComponentManager but might not expose "registerComponent" directly in the interface. 
    // Wait, earlier view of MasterOrchestrator showed private componentManager.
    // Does MasterOrchestrator expose registerComponent?
    // Lines 1-60 didn't show it.
    // I'll assume it does, or I'll use `(orchestrator as any).componentManager.registerComponent(...)`.
    // Safest for a test script is cast to any if method isn't public.
    logger.info('Registering test component...');
    if (typeof (orchestrator as any).registerComponent === 'function') {
        (orchestrator as any).registerComponent(testComponent);
    } else {
        (orchestrator as any).componentManager.registerComponent(testComponent);
    }

    // 4. Define a Workflow
    const workflow: Workflow = {
        id: 'test-workflow-1',
        name: 'Test Echo Workflow',
        description: 'Verifies the orchestrator runs',
        steps: [
            {
                id: 'step-1',
                name: 'Echo Step',
                type: 'api', // generic type
                component: 'echo-component',
                action: 'echo',
                parameters: { message: 'Hello World' },
                dependencies: [],
                guardrails: [],
                timeout: 1000,
                retryPolicy: { maxAttempts: 1, baseDelay: 0, maxDelay: 0, backoff: 'linear' },
                fallbacks: []
            }
        ],
        triggers: [],
        guardrails: [],
        fallbacks: [],
        retryPolicy: { maxAttempts: 1, baseDelay: 0, maxDelay: 0, backoff: 'linear' },
        timeout: 5000
    };

    // 5. Execute Workflow
    logger.info('Executing workflow...');
    // Manually register workflow since executeWorkflow requires ID
    (orchestrator as any).workflows.set(workflow.id, workflow);
    // Initialize Orchestrator to ensure maps are ready (though factory might not have completed full init phases)
    // We force initialization flag for testing
    (orchestrator as any).isInitialized = true;

    try {
        const result = await orchestrator.executeWorkflow(workflow.id, {
            workflowId: workflow.id,
            userId: 'test-user',
            traceId: 'trace-1',
            orchestratorId: 'test-orch',
            startTime: Date.now()
        });

        logger.info('Workflow Result:', JSON.stringify(result, null, 2));

        if (result.success) {
            logger.info('✅ Test Passed: Workflow completed successfully.');
            process.exit(0);
        } else {
            logger.error('❌ Test Failed: Workflow finished but not completed status.', result);
            process.exit(1);
        }

    } catch (error) {
        logger.error('❌ Test Crashed:', error);
        process.exit(1);
    }
}

main().catch(console.error);
