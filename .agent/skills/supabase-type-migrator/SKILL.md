---
name: supabase-type-migrator
description: Regenerate and align Supabase database types
---


# Supabase Type Migration Skill

Refactors database integration to use strict, auto-generated Supabase types, eliminating `never` inference errors.

## Workflow
Follow the `.agent/workflows/supabase-type-migration.md` workflow.

## Key Concepts

### Wrappers
We use wrapper types to simplify access to the complex generated `Database` interface:
```typescript
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type InsertDto<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type UpdateDto<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];
```

### Handling `never`
The generated types might assign `never` to fields that are optional in the DB.
1. **Wrapper Cast**: `as unknown as InsertDto<'table'>` - Preferred.
2. **Builder Cast**: `(client.from('table') as any).update(...)` - Use when the method signature itself forbids arguments (e.g., `update(values: never)`).

