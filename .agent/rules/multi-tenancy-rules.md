# Multi-Tenancy Implementation Rules

## Mandatory Rules

### 1. Always Check Method Signatures
Before calling any database method, verify the parameter order:
- Use IDE autocomplete
- View method definition
- Check existing usage patterns

### 2. Consistent Parameter Order
- **Search methods**: `tenantId` is FIRST parameter
- **CRUD methods**: `tenantId` is SECOND parameter (after id/data)
- **Never guess** - always verify

### 3. Import Required Dependencies
When adding middleware:
```typescript
// ✅ ALWAYS import before using
import { multiTenancyMiddleware, requireTenant } from '../middleware/multi-tenancy.middleware';

// ❌ NEVER reference without importing
router.use(multiTenancyMiddleware); // Error if not imported
```

### 4. Extract tenantId Early
In API handlers:
```typescript
// ✅ Extract at start of handler
async handler(req: Request, res: Response) {
  const tenantId = req.tenantId!;
  // Use throughout method
}

// ❌ Don't inline everywhere
await dbManager.getData(id, req.tenantId!); // Repetitive, error-prone
```

### 5. Propagate tenantId Through Call Chain
Every method that calls database operations must:
1. Accept `tenantId` parameter
2. Pass it to all database calls
3. Pass it to all service method calls

```typescript
// ✅ CORRECT - full propagation
async processLead(leadId: string, tenantId: string) {
  const lead = await this.dbManager.getLead(leadId, tenantId);
  await this.notifyAgent(lead, tenantId);
  await this.createAuditLog(leadId, tenantId);
}

// ❌ WRONG - breaks chain
async processLead(leadId: string, tenantId: string) {
  const lead = await this.dbManager.getLead(leadId, tenantId);
  await this.notifyAgent(lead); // Missing tenantId!
}
```

### 6. Handle Background Services Explicitly
For services without request context:
```typescript
// ✅ CORRECT - acknowledge limitation
const DEFAULT_TENANT_ID = 'default';
// TODO: Refactor for proper multi-tenant support

async backgroundSync() {
  // TODO: Iterate over all tenants
  const data = await this.dbManager.getData(id, DEFAULT_TENANT_ID);
}

// ❌ WRONG - silent single-tenant assumption
async backgroundSync() {
  const data = await this.dbManager.getData(id, 'default'); // No TODO, no plan
}
```

### 7. Run Typecheck After Changes
```bash
# MANDATORY after any multi-tenancy refactoring
npm run typecheck

# Fix ALL errors before committing
# Common errors indicate:
# - Missing parameters
# - Wrong parameter order
# - Missing imports
```

## Code Review Checklist

Before marking multi-tenancy work complete:

- [ ] All database methods accept `tenantId`
- [ ] All database calls pass `tenantId`
- [ ] Parameter order matches method signatures
- [ ] Middleware imported and applied (API services)
- [ ] `express.d.ts` augmented with `tenantId`
- [ ] Background services have TODO comments
- [ ] `npm run typecheck` passes with 0 errors
- [ ] No hardcoded tenant IDs (except `DEFAULT_TENANT_ID` with TODO)

## Anti-Patterns to Avoid

### ❌ Assuming Parameter Order
```typescript
// WRONG - assuming without checking
await dbManager.searchLeads({ status: 'new' }, tenantId);
// Could be correct or wrong - MUST verify signature
```

### ❌ Partial Refactoring
```typescript
// WRONG - only updating some calls
async handler(req: Request, res: Response) {
  const tenantId = req.tenantId!;
  await this.dbManager.getLead(id, tenantId); // ✅
  await this.dbManager.createEvent(event); // ❌ Missing tenantId
}
```

### ❌ Silent Failures
```typescript
// WRONG - catching and ignoring tenant errors
try {
  await this.dbManager.getData(id, tenantId);
} catch (error) {
  // Silently fail - tenant isolation broken!
  return null;
}
```

### ❌ Global Tenant State
```typescript
// WRONG - using class property for tenant
class Service {
  private currentTenantId: string; // ❌ Race conditions!
  
  async process(data) {
    await this.dbManager.getData(id, this.currentTenantId);
  }
}

// CORRECT - pass as parameter
class Service {
  async process(data, tenantId: string) {
    await this.dbManager.getData(id, tenantId);
  }
}
```

## Best Practices

### ✅ Use Type Safety
```typescript
// Leverage TypeScript to catch errors
interface TenantScoped {
  tenantId: string;
}

async processData(params: TenantScoped & { id: string }) {
  // TypeScript ensures tenantId is present
  await this.dbManager.getData(params.id, params.tenantId);
}
```

### ✅ Document Architectural Limitations
```typescript
/**
 * CRM Sync Service
 * 
 * TODO: Multi-tenant architecture needed
 * Current limitation: Uses DEFAULT_TENANT_ID for background sync
 * 
 * Proposed solutions:
 * 1. Per-tenant sync jobs
 * 2. Iterate over all active tenants
 * 3. Tenant-scoped service instances
 */
```

### ✅ Test Tenant Isolation
```typescript
// Create tests that verify isolation
describe('Multi-tenancy', () => {
  it('should not return data from other tenants', async () => {
    const tenant1Data = await service.getData(id, 'tenant1');
    const tenant2Data = await service.getData(id, 'tenant2');
    expect(tenant1Data).not.toEqual(tenant2Data);
  });
});
```
