/**
 * Orchestrator Factory
 * Bridges the gap between ProductionBootstrapService (DI) and MasterOrchestrator (Legacy)
 */

import { MasterOrchestrator } from './master-orchestrator.js';
import { OrchestratorDependencies, MasterOrchestratorConfig } from '../types/orchestration.types.js';

export class OrchestratorFactory {
    /**
     * Create a new MasterOrchestrator instance with injected dependencies
     * @param config The orchestrator configuration
     * @param dependencies The resolved system dependencies
     */
    static create(config: MasterOrchestratorConfig, dependencies: OrchestratorDependencies): MasterOrchestrator {
        // Create the orchestrator with injected dependencies
        return new MasterOrchestrator(config, dependencies);
    }
}
