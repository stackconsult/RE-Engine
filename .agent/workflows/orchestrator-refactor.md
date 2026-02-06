---
description: Orchestrator Refactoring Workflow
---

# Orchestrator Refactoring Workflow

This workflow guides the refactoring of the monolithic `MasterOrchestrator` and `WorkflowExecutionEngine` to use the modern `ProductionBootstrapService` type-safe dependency injection system.

## Phase 1: Preparation & Analysis
1.  **Audit Dependencies**:
    - Identify all services instantiated via `new Service()` in `MasterOrchestrator` methods.
    - Map these to the interfaces provided by `ProductionBootstrapService`.
2.  **Define Interfaces**:
    - Create `OrchestratorDependencies` interface in `types/orchestration.types.ts`.
    - Ensure it matches `ProductionBootstrapResult` services.

## Phase 2: Factory Implementation
1.  **Create Factory**:
    - Create `src/orchestration/orchestrator-factory.ts`.
    - Implement `createOrchestrator(bootstrapResult: ProductionBootstrapResult): MasterOrchestrator`.
    - Ensure it acts as the bridge between `ProductionBootstrapService` and `MasterOrchestrator`.

## Phase 3: Core Refactoring
// turbo
1.  **Refactor MasterOrchestrator Ctor**:
    - Change constructor to accept `OrchestratorDependencies` instead of instantiating services internally.
    - Remove direct `new ComponentManager()`, `new WorkflowExecutionEngine()`, etc., where possible, or pass dependencies down.
2.  **Refactor WorkflowExecutionEngine**:
    - Update `WorkflowExecutionEngine` to accept `OrchestratorDependencies` or specific services (Logger, DB) if needed.
    - Remove `@ts-nocheck`.

## Phase 4: Integration
1.  **Update Entry Point**:
    - Modify `src/index.ts` (or main entry) to:
        1. Run `ProductionBootstrapService.bootstrap()`.
        2. Pass result to `OrchestratorFactory.create()`.
        3. Start the Orchestrator.
2.  **Verify**:
    - Run `npm run build`.
    - Verify no regression in tests.
