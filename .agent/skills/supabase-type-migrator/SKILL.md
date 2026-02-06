---
name: supabase-type-migrator
description: Regenerate and align Supabase database types
---

# Supabase Type Migration Skill

Refactors database integration to use strict, auto-generated Supabase types, eliminating `never` inference errors.

## Steps

1.  **Regenerate Types**:
    -   Run `npm run update-types` (or `supabase gen types typescript --project-id ...`).
    -   Verify output in `src/database/supabase.types.ts` (or similar).

2.  **Analyze Mismatches**:
    -   Identify "Insert" and "Update" type usage where optional fields cause `never` inference.
    -   This happen when a Table type expects all columns but the client provides a subset (relying on DB defaults).

3.  **Create Utility Types**:
    -   Define helper types in `src/shared/types.ts` or `database/types.ts`:
        ```typescript
        type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
        type InsertDto<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
        type UpdateDto<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];
        ```

4.  **Refactor Services**:
    -   In `supabase-integration.service.ts`, explicitly cast payloads to `InsertDto<'table_name'>`.
    -   Remove `@ts-nocheck` once errors clear.
