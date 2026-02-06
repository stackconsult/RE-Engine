---
name: orchestrator-refactor
description: Break down monolithic orchestrators using Strategy Pattern
---

# Orchestrator Refactoring Skill

Decomposes complex orchestrator classes into manageable, testable strategies.

## Steps

1.  **Identify Responsibilities**:
    -   Analyze `MasterOrchestrator` or `WorkflowExecutionEngine`.
    -   Identify distinct chunks of logic (e.g., "Resource Allocation", "Error Recovery", "Step Execution").

2.  **Define Strategy Interface**:
    -   Create interfaces for the extracted logic.
    -   Example: `IWorkflowExecutor`, `IResourceAllocator`.

3.  **Extract Implementation**:
    -   Move logic to new files in `src/orchestration/strategies/` or `src/orchestration/components/`.
    -   Ensure strict typing for inputs/outputs.

4.  **Inject Dependencies**:
    -   Update the main Orchestrator to accept these strategies via constructor (Dependency Injection).
    -   Remove the inline logic.

5.  **Strict Typing**:
    -   Ensure the new components do not use `any`.
    -   Remove `@ts-nocheck` from the main file.
