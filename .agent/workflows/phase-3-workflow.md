---
description: Phase 3 Middleware & Hardening Execution Guide
---

# Phase 3: Middleware, Types & System Hardening

User: "Elevate the system from 'Building' to 'Strictly Typed & Production Ready'."

This workflow orchestrates the systematic hardening of the codebase, focusing on Middleware types, Database SDK alignment, and Orchestration refactoring.

## Prerequisites
- [x] Phase 1 & 2 Complete (Build passes, critical services wired)
- [x] `ts-node` or `tsx` available for running scripts
- [x] Supabase CLI configured (for type generation)

## Workflow Steps

### 1. Express Type Augmentation
**Goal**: Solve the `req.user` type conflict globally.

- [ ] Use `express-type-augmentor` skill.
- [ ] Create `src/types/express.d.ts`.
- [ ] Remove `@ts-nocheck` from `src/auth/auth.middleware.ts`.
- [ ] Verify build `npm run build`.

### 2. Supabase SDK Type Migration
**Goal**: Eliminate 26+ errors in database service.

- [ ] Use `supabase-type-migrator` skill.
- [ ] Regenerate types.
- [ ] Refactor `supabase-integration.service.ts` to use `InsertDto`/`UpdateDto`.
- [ ] Remove `@ts-nocheck` from `src/database/supabase-integration.service.ts`.

### 3. Mobile API Strict Typing
**Goal**: Ensure API layer consumes augmented types correctly.

- [ ] Remove `@ts-nocheck` from `src/api/mobile-api.service.ts`.
- [ ] Verify `req.user` access works without local casting.

### 4. Orchestrator Refactoring (Incremental)
**Goal**: Reduce complexity and enable strict mode.

- [ ] Use `orchestrator-refactor` skill.
- [ ] Analyze `MasterOrchestrator` complexity.
- [ ] Extract at least one sub-component (e.g., `ExecutionStateTracker`).

### 5. Final Validation
- [ ] Run `npm run build` (Must be clean).
- [ ] Run `npm test` (Must pass).

## Validation Criteria
- Zero `@ts-nocheck` in `src/auth/`, `src/api/`, `src/database/`.
- `npm run build` exits with code 0.
