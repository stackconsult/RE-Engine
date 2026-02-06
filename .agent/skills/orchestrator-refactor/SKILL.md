---
name: orchestrator-refactor
description: Break down monolithic orchestrators using Strategy Pattern and Dependency Injection
---

# Orchestrator Refactoring Skill

This skill provides the capability to systematically refactor the legacy `MasterOrchestrator` into a testable, modular system using Dependency Injection.

## Context
The `MasterOrchestrator` currently instantiates its own dependencies (`new ComponentManager()`, etc.), which makes it tightly coupled and hard to test. We need to inject these dependencies from the `ProductionBootstrapService`.

## Instructions

### 1. Analyze Injection Points
Before changing code, identify which services need to be injected.
- Look for `this.service = new Service()` in constructors.
- Map them to `ProductionBootstrapResult` properties.

### 2. Create Interfaces First
Do not modify the class until the dependency interface is defined.
```typescript
export interface OrchestratorDependencies {
  logger: Logger;
  db: UnifiedDatabaseManager;
  // ... other deps
}
```

### 3. Implement Factory Pattern
Use a Factory to bridge the gap. Do not make `master-orchestrator.ts` depend on `production-bootstrap.service.ts` directly if avoid circular deps.
```typescript
export class OrchestratorFactory {
  static create(deps: OrchestratorDependencies): MasterOrchestrator {
    return new MasterOrchestrator(config, deps);
  }
}
```

### 4. Step-by-Step Refactor
Refactor one service at a time to minimize compilation errors.
1. Add service to `OrchestratorDependencies` interface.
2. Add service to Constructor arguments.
3. Remove `new Service()` instantiation.
4. Update `OrchestratorFactory`.

## Verification
- Run `npm run build` frequently.
- Ensure `@ts-nocheck` is removed from the file header upon completion.
