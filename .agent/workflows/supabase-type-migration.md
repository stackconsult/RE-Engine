---
description: Systematic guide for migrating and wrapping Supabase types
---

# Supabase Type Migration Workflow

This workflow guides the systematic update of Supabase types and the implementation of wrapper types to resolve `never` inference errors caused by strict type checks on generated definitions.

## 1. Regenerate Types
Ensure your local type definitions match the remote database schema.

```bash
# Verify project ID first!
# npx supabase gen types typescript --project-id <PROJECT_ID> > src/database/supabase.types.ts
```
*(Note: You may need to obtain the Project ID from the user or .env file before running this)*

## 2. Create Wrapper Types
Define a shared utility file `src/database/db-types.ts` to abstract the complex generated types. This isolates the application from the raw generated structure.

```typescript
// src/database/db-types.ts
import { Database } from './supabase.types';

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type InsertDto<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type UpdateDto<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T];
```

## 3. Refactor Services
Update files like `supabase-integration.service.ts` and `unified-database-manager.ts` to use these wrappers.


### Fix `never` Inference
When `Insert` or `Update` types infer `never` due to strict schema definitions, standard casting may not be sufficient. You may need to cast the builder itself or the argument to `any` to bypass the `insert(values: never)` restriction.

**Strategy 1: Argument Cast**
```typescript
.insert(payload as any)
```

**Strategy 2: Builder Cast (for stubborn updates)**
```typescript
(client.from('table') as any).update(payload)
```

### Logger Compliance
Verify that `logError` calls use the correct signature `(error: Error, context: string)`. Supabase SDK errors are often plain objects, so wrap them:
```typescript
logError(error instanceof Error ? error : new Error(String(error)), 'Context message');
```

### Realtime Channel Management
When using `subscribe()`, explicit `RealtimeChannel` management is required for cleaner unsubscription. Store the channel object returned by `.channel()`:
```typescript
const channel = client.channel(id).on(...).subscribe();
subscriptions.set(id, { subscription, channel });
// Unsubscribe:
await channel.unsubscribe();
```

## 4. Verification
Run the build to ensure all type errors are resolved.

```bash
npm run build
```
// turbo
