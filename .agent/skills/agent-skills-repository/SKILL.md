---
name: Universal Agent Skills Repository
description: Collection of executable SOPs with automatic trigger detection
---

# Universal Agent Skills Repository

**SYSTEM INSTRUCTION:** You (the Agent) MUST scan this file at the start of every task. If a user request matches a **Trigger**, you must AUTOMATICALLY execute the corresponding protocol without being asked.

---

## Skill 1: Safe Schema Update
**Trigger**: User asks to "update database", "add field", "change schema", or "migrate DB".
**Prerequisites**: Clean git status.

### Protocol:
1. **Analyze**: Locate migration files (e.g., `migrations/*.sql`).
2. **Safety Check**: 
   - Ask: "Does this delete data?" (If yes, STOP).
   - Check: Are there dependent types/models?
3. **Execute**:
   - Create migration file with timestamp/slug.
   - Use idempotent SQL (`IF NOT EXISTS`).
   - All tables MUST include `tenant_id` for isolation.
4. **Verify**:
   - Run `npm run typecheck`.

---

## Skill 2: Robust Service Implementation (DI Pattern)
**Trigger**: User asks to "create service", "add logic", "implement business rule".
**Philosophy**: Dependency Injection & Scoping.

### Protocol:
1. **Scaffold**: Create file following project patterns (`*.service.ts`).
2. **Context Check**:
   - **Multi-Tenancy**: All methods MUST accept `tenantId` or be called within a tenant context.
   - **DI**: Pass required services (e.g., `UnifiedDatabaseManager`) into the constructor.
3. **Error Handling**:
   - Wrap public methods in `try/catch`.
4. **Verify**:
   - Run `npm run typecheck`.

---

## Skill 3: Test-Driven Feature (Green-Light)
**Trigger**: User asks to "implement feature", "add functionality", "fix bug".
**Philosophy**: Test First.

### Protocol:
1. **Scaffold Test**: Create a test file (`*.test.ts`) *before* implementation.
2. **Red State**: Write a test case that replicates the requirement/bug and FAILS.
3. **Implement**: Write minimal code to pass the test.
4. **Green State**: Run test to verify PASS.

---

## Skill 4: External Integration (Adapter Pattern)
**Trigger**: User asks to "integrate `Service`", "connect `API`", "sync with `Provider`".
**Established Model**: See `src/integrations/adapters/`.

### Protocol:
1. **Interface**: Define a generic interface in `src/integrations/interfaces/`.
2. **Adapter**: Create specific provider class in `src/integrations/adapters/`.
3. **Resilience**:
   - Implement exponential backoff for rate limits.
   - Separate "Mocking" logic from "Real" API calls via config.
4. **Scoping**: All external data MUST be tagged with `tenant_id` before database insertion.

---

## Skill 5: Multi-Tenancy Isolation Check
**Trigger**: User asks to "verify isolation", "check tenant data", "security audit".

### Protocol:
1. **Search Query Audit**: Ensure all `SELECT/UPDATE/DELETE` calls include `WHERE tenant_id = $1`.
2. **Middleware Check**: Verify `MultiTenancyMiddleware` is applied to relevant routes.
3. **Test Execution**: Run `src/scripts/test-tenant-isolation.ts` if available.

---

## Skill 6: Safe Automation Workflow
**Trigger**: User asks to "automate X", "create workflow", "connect trigger".

### Protocol:
1. **Trigger Definition**: Validate incoming payloads (signatures, schemas).
2. **Approval Gate**:
   - **Outbound Check**: If sending messages/money, ADD AN APPROVAL STEP to the `approvals` table.
3. **Wiring**: Register handler in `src/api/` or `src/engine/`.

---

## Skill 7: Session Audit & Hygiene
**Trigger**: User says "prepare commit", "wrap up", "audit".

### Protocol:
1. **Cleanup**: Delete temp files.
2. **Quality Check**: Run `npm run lint` and `npm run typecheck`.
3. **Summary**: Update `task.md` and generate a concise commit message.
