---
description: Systematic guide for migrating UnifiedDatabaseManager to strict types
---

# Unified Database Manager Migration Workflow

This workflow guides the refactoring of `UnifiedDatabaseManager.ts` to use strict Supabase types, removing legacy manual interfaces and `@ts-nocheck`.

## 1. Analysis & Prep
- [ ] Review `UnifiedDatabaseManager.ts`.
- [ ] Identify all manual interfaces (`LeadData`, `ApprovalData`, etc.) that replicate DB schema.

## 2. Type Replacement
- [ ] Remove `@ts-nocheck`.
- [ ] Import `Database`, `InsertDto`, `UpdateDto` from `db-types.ts`.
- [ ] Replace manual interfaces with `Row` types from `Database`.
  - `LeadData` -> `Database['public']['Tables']['leads']['Row']`
  - `ApprovalData` -> `Database['public']['Tables']['approvals']['Row']`
  - `EventData` -> `Database['public']['Tables']['events']['Row']`
  - `AgentData` -> `Database['public']['Tables']['agents']['Row']`

## 3. Implementation Fixes
- [ ] Update method signatures to use explicit types.
- [ ] Fix `create` and `update` calls using Builder Casting if `never` types persist and cannot be resolved by wrappers alone.
  ```typescript
  (client.from('table') as any).insert(...)
  ```
- [ ] Fix `logError` signatures to `(error: Error, context: string)`.

## 4. Verification
- [ ] Run `npm run build`.
- [ ] Verify no type errors in `UnifiedDatabaseManager.ts`.
