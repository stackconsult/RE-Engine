---
name: unified-database-migrator
description: Refactor UnifiedDatabaseManager to use strict Supabase types
---

# Unified Database Migrator Skill

Refactors `UnifiedDatabaseManager.ts` to align with strict Supabase types (`Database`, `InsertDto`, `UpdateDto`).

## Key Actions

### 1. Remove @ts-nocheck
- Remove the top directive.

### 2. Replace Manual Types
Replace interfaces like `LeadData` with generated types:
```typescript
import { Database } from '../supabase.types.js';
export type LeadData = Database['public']['Tables']['leads']['Row'];
```
Or directly use `Database[...]` in signatures.

### 3. Builder Casting for `insert`/`update`
If generating strict types causes `never` inference:
```typescript
const { data, error } = await (client.from('leads') as any)
  .insert(lead as any)
  .select()
  .single();
```
(Note: `as any` is used because the generated strict types often define `insert(values: never)` for complex schemas, requiring manual override).

### 4. Logger Fixes
Ensure `logError` uses `(error instanceof Error ? error : new Error(String(error)))`.

## Verification
Wait for `npm run build` success.
