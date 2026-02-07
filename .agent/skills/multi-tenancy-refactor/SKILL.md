---
name: Multi-Tenancy Refactoring
description: Systematic approach to adding tenant isolation to existing codebases
---

# Multi-Tenancy Refactoring Skill

## Purpose
Refactor existing services to support multi-tenancy with strict data isolation by adding `tenantId` parameters to all data operations.

## Key Principles

### 1. Parameter Order Consistency
Different method types have different parameter orders:

**Search/Query Methods** (tenantId FIRST):
```typescript
searchLeads(tenantId: string, criteria: SearchCriteria)
searchLeads(tenantId: string, filters: {...})
```

**Get/Create/Update Methods** (tenantId SECOND):
```typescript
getLead(id: string, tenantId: string)
createEvent(event: EventData, tenantId: string)
createApproval(approval: ApprovalData, tenantId: string)
updateLead(id: string, updates: Partial<Lead>, tenantId: string)
```

**Why?** Search methods take complex criteria objects, so `tenantId` comes first for clarity. CRUD methods have a primary identifier (id/data), so `tenantId` comes second.

### 2. Refactoring Checklist
For each service file:

1. ✅ **Import middleware** (if API service)
2. ✅ **Update method signatures** to accept `tenantId`
3. ✅ **Extract tenantId** from request (API) or parameters (service)
4. ✅ **Pass tenantId** to ALL database calls
5. ✅ **Verify parameter order** matches method signature
6. ✅ **Run typecheck** to catch errors

### 3. Common Patterns

#### API Service Pattern
```typescript
// Add middleware
import { multiTenancyMiddleware, requireTenant } from '../middleware/multi-tenancy.middleware';

// In route setup
router.use(multiTenancyMiddleware);
router.use(requireTenant);

// In handler
async handler(req: Request, res: Response) {
  const tenantId = req.tenantId!; // Safe after requireTenant
  const data = await this.dbManager.getData(id, tenantId);
}
```

#### Service Method Pattern
```typescript
// Update signature
async processData(id: string, tenantId: string): Promise<Result> {
  // Pass to all database calls
  const data = await this.dbManager.getData(id, tenantId);
  const related = await this.dbManager.searchRelated(tenantId, { id });
  await this.dbManager.createEvent(event, tenantId);
  return result;
}
```

#### Background Job Pattern
```typescript
// Temporary placeholder approach
const DEFAULT_TENANT_ID = 'default'; // TODO: Refactor for multi-tenant

async backgroundSync() {
  // TODO: Iterate over all tenants or create per-tenant jobs
  const data = await this.dbManager.getData(id, DEFAULT_TENANT_ID);
}
```

### 4. Error Prevention

**Before making changes:**
1. View the method signature you're calling
2. Check parameter order and types
3. Ensure `tenantId` is in scope

**Common mistakes:**
```typescript
// ❌ WRONG - parameter order
await dbManager.searchLeads({ criteria }, tenantId);

// ✅ CORRECT
await dbManager.searchLeads(tenantId, { criteria });

// ❌ WRONG - missing import
router.use(multiTenancyMiddleware); // Error: not defined

// ✅ CORRECT
import { multiTenancyMiddleware } from '../middleware/multi-tenancy.middleware';
router.use(multiTenancyMiddleware);
```

### 5. Verification Steps

After refactoring:
```bash
# 1. Type check
npm run typecheck

# 2. Look for specific errors
# - "Expected N arguments, but got M"
# - "Cannot find name 'tenantId'"
# - "Argument of type X is not assignable to parameter of type Y"

# 3. Fix errors by checking method signatures
```

## Architecture Considerations

### Background Services
Services with scheduled jobs or event listeners need architectural changes:

**Options:**
1. **Per-Tenant Instances**: Create service instance per tenant
2. **Tenant Iteration**: Loop through all active tenants
3. **Tenant-Scoped Jobs**: Schedule separate jobs per tenant

**Temporary Solution:**
- Use `DEFAULT_TENANT_ID` constant
- Add TODO comments
- Plan proper refactoring

### Migration Scripts
One-time scripts need tenant specification:

**Options:**
1. Accept `--tenant-id` CLI argument
2. Migrate all tenants in sequence
3. Create tenant-specific migration files

## Testing Strategy

1. **Unit Tests**: Mock `tenantId` in test data
2. **Integration Tests**: Create multiple tenant contexts
3. **Isolation Tests**: Verify cross-tenant access fails
4. **Real-time Tests**: Ensure subscriptions are scoped

## References
- Workflow: `.agent/workflows/multi-tenancy-implementation.md`
- Example: `engine/src/api/mobile-api.service.ts`
- Middleware: `engine/src/middleware/multi-tenancy.middleware.ts`
