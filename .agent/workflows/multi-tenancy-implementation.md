---
description: Complete workflow for implementing multi-tenancy with tenant isolation
---

# Multi-Tenancy Implementation Workflow

## Phase 1: Schema Updates
1. Update database schemas (Neon & Supabase) to add `tenant_id` column to all relevant tables
   - Add `tenant_id VARCHAR(255) NOT NULL` to tables: contacts, icp_profiles, identities, leads, approvals, events, agents
   - Create indexes: `CREATE INDEX idx_<table>_tenant_id ON <table>(tenant_id);`
   - Update Supabase types: regenerate `supabase.types.ts`

2. Update authentication types to include `tenant_id`
   - Modify `JWTPayload`, `User`, `DatabaseRow` interfaces in `auth.service.ts`
   - Ensure `tenant_id` is populated during user authentication

## Phase 2: Middleware Implementation
1. Create `multi-tenancy.middleware.ts` with two middleware functions:
   ```typescript
   export const multiTenancyMiddleware = (req, res, next) => {
     // Extract tenant_id from req.user or headers
     if (req.user?.tenant_id) req.tenantId = req.user.tenant_id;
     else if (req.headers['x-tenant-id']) req.tenantId = req.headers['x-tenant-id'];
     next();
   };
   
   export const requireTenant = (req, res, next) => {
     if (!req.tenantId) return res.status(403).json({ error: 'Tenant context required' });
     next();
   };
   ```

2. Augment Express Request type in `express.d.ts`:
   ```typescript
   declare global {
     namespace Express {
       interface Request {
         tenantId?: string;
       }
     }
   }
   ```

## Phase 3: Database Manager Refactoring
1. Update `UnifiedDatabaseManager` method signatures:
   - **Pattern 1** (tenantId FIRST): `searchLeads(tenantId: string, criteria: {...})`
   - **Pattern 2** (tenantId SECOND): `getLead(id: string, tenantId: string)`
   - **Pattern 3** (tenantId SECOND): `createEvent(event: {...}, tenantId: string)`

2. Update all CRUD methods in order:
   - Lead operations: `createLead`, `getLead`, `updateLead`, `searchLeads`
   - Approval operations: `createApproval`, `getPendingApprovals`, `updateApprovalStatus`
   - Event operations: `createEvent`, `getLeadEvents`
   - Contact/ICP/Identity/Agent operations
   - Dashboard/metrics operations

3. Update `NeonIntegrationService` to scope all SQL queries by `tenant_id`
   - Add `WHERE tenant_id = $N` to all SELECT queries
   - Add `tenant_id` to INSERT statements and VALUES arrays
   - Update all method signatures to accept `tenantId`

4. Update `SupabaseIntegrationService` similarly
   - Add `.eq('tenant_id', tenantId)` to all queries
   - Include `tenant_id` in all insert/update operations

## Phase 4: Service Layer Updates
**CRITICAL**: When updating services, follow this pattern:

1. **Identify all database calls** in the service
2. **Update method signatures** to accept `tenantId` parameter
3. **Pass `tenantId` to all database operations** in correct parameter position
4. **Check parameter order** against method signature:
   - Use IDE autocomplete or view method signature
   - `searchLeads` → tenantId is FIRST
   - `getLead`, `createEvent`, `createApproval` → tenantId is SECOND

5. **For API services**, extract `tenantId` from request:
   ```typescript
   const tenantId = req.tenantId!; // After requireTenant middleware
   ```

6. **For background services** (CRM sync, scheduled jobs):
   - Add TODO comment for proper multi-tenant architecture
   - Use `DEFAULT_TENANT_ID` placeholder temporarily
   - Plan refactoring for per-tenant execution

## Phase 5: Verification
1. Run typecheck: `npm run typecheck`
2. Fix any "Expected N arguments, but got M" errors
3. Fix any "Cannot find name 'tenantId'" errors
4. Verify all database operations include `tenantId`

## Phase 6: Data Isolation Testing
1. Create test script with multiple tenant contexts
2. Verify CRUD operations are scoped correctly
3. Test cross-tenant data access prevention
4. Validate real-time subscriptions are tenant-aware

## Common Pitfalls
- ❌ Forgetting to import middleware functions
- ❌ Wrong parameter order (check method signature!)
- ❌ Missing `tenantId` in nested service calls
- ❌ Background jobs without tenant context
- ❌ Hardcoded tenant IDs in production code
