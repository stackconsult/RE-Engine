---
name: RE-Engine Agent Skills Repository
description: Executable SOPs for complex development tasks - reduces hallucination and error rates
---

# Agent Skills Repository

These skills act as **executable standard operating procedures (SOPs)**. When you need to perform a complex task, invoke the appropriate skill by name and follow the protocol exactly.

**Usage:** Prompt with *"Execute Skill: [Skill Name]"* to run the protocol.

---

## Skill 1: Safe Schema Update (PostgreSQL/Neon)

**Trigger**: "Update the database schema" or "Add field to [Table]"
**Prerequisites**: Clean git status

### Protocol:

1. **Analyze**: Read relevant migration files in `engine/src/database/migrations/`
2. **Safety Check**:
   - Does this change delete data? (If yes, **STOP** and ask for confirmation)
   - Is there a corresponding TypeScript type that needs updating?
3. **Execute**:
   - Create new migration file: `XXX_[descriptive_name].sql`
   - Ensure `IF NOT EXISTS` for CREATE statements
   - Add `tenant_id` column if multi-tenant table
4. **Verification**:
   - Run: `npm run typecheck` to ensure no type errors
   - Check that new fields are reflected in service types

---

## Skill 2: Safe Service Implementation

**Trigger**: "Create new service" or "Add feature to service"
**Philosophy**: Multi-tenant by default, type-safe always

### Protocol:

1. **Scaffold**:
   - Create service file in `engine/src/[domain]/[name].service.ts`
   - Import necessary types and Logger
2. **Multi-Tenancy Check**:
   - **CRITICAL**: All database operations MUST include `tenantId` parameter
   - Follow parameter order convention: `tenantId` first for search, second for CRUD
3. **Error Handling**:
   - Wrap all async operations in `try/catch`
   - Log errors with `this.logger.error()`
   - Re-throw for caller handling
4. **Verification**:
   - Run: `npm run typecheck`
   - Ensure no `any` types unless absolutely necessary

---

## Skill 3: Green-Light Feature Dev (TDD)

**Trigger**: "Implement feature [X]"
**Philosophy**: Write the test *before* the code to prevent logic drift

### Protocol:

1. **Scaffold**: Create a new test file `tests/integration/[feature].test.ts`
2. **Draft Test**: Write a test case that fails (Red)
   - *Example*: `expect(service.calculateScore(lead)).toBe('A')`
3. **Implement**:
   - Create/Edit the service file in `engine/src/`
   - Write the *minimum* code needed to satisfy the test
4. **Loop**:
   - Run: `npm test -- [feature]`
   - If Fail: Fix logic
   - If Pass: Run `npm run lint` to clean up

---

## Skill 4: Full MCP Swarm Deployment

**Trigger**: "Rebuild all MCP servers" or "Deploy AI tools"
**Context**: RE-Engine relies on multiple MCP servers

### Protocol:

1. **Clean**: Run `rm -rf dist` in all MCP directories (prevent stale artifacts)
2. **Build Loop**:
   ```bash
   cd mcp/[server-name] && npm install && npm run build
   ```
3. **Config Check**:
   - Read MCP settings file
   - Verify paths point to new `dist/index.js` files
4. **Restart**: Instruct user to "Restart the MCP Host / IDE" to reload

---

## Skill 5: New Automation Workflow

**Trigger**: "Create a new automation flow" (e.g., WhatsApp -> AI -> CRM)

### Protocol:

1. **Define Trigger**:
   - Create handler in `engine/src/engine/` or appropriate directory
   - Ensure it validates incoming payload
2. **Define Action**:
   - Create a service method in `engine/src/`
   - **Rule**: Must wrap external calls in `try/catch`
3. **Approval Gate**:
   - **CRITICAL**: Does this send a message? If yes, insert a record into `approvals` table
   - *Code Pattern*: `await this.dbManager.createApproval({ ... }, tenantId)`
4. **Wiring**:
   - Register the trigger in the appropriate router/API

---

## Skill 6: CRM Adapter Implementation

**Trigger**: "Add CRM integration" or "Implement [Provider] sync"
**Context**: CRM adapters follow Strategy Pattern

### Protocol:

1. **Create Adapter**: `engine/src/integrations/adapters/[provider]-adapter.ts`
2. **Implement Interface**:
   ```typescript
   export interface CRMAdapter {
     searchProperties(criteria: PropertySearchCriteria): Promise<PropertyData[]>;
     getPropertyDetails(externalId: string): Promise<PropertyData | null>;
     validateCredentials(): Promise<boolean>;
   }
   ```
3. **Multi-Tenancy**:
   - Store credentials per tenant
   - Scope all data by `tenantId`
4. **Rate Limiting**:
   - Implement exponential backoff
   - Track API usage per tenant
5. **Verification**:
   - Write integration tests with mock responses
   - Test tenant isolation

---

## Skill 7: Session Audit (Cost & Hygiene)

**Trigger**: "Audit session" or "Prepare for commit"

### Protocol:

1. **Token Check**: Report current session cost
2. **File Cleanup**:
   - Did we create temporary files? Delete them
   - Check for `console.log` statements that should be removed
3. **Lint**: Run `npm run lint -- --fix`
4. **Typecheck**: Run `npm run typecheck`
5. **Summary**: Generate a 3-bullet summary of changes for Git commit message

---

## Skill 8: Database Migration Execution

**Trigger**: "Run database migrations" or "Apply schema changes"
**Prerequisites**: Neon database connection available

### Protocol:

1. **Backup Check**: Verify recent backup exists or create one
2. **Review**: Read migration files in order
3. **Execute**:
   - Connect to Neon database
   - Run migrations in transaction
   - Rollback on first error
4. **Verify**:
   - Test connection
   - Verify new tables/columns exist
   - Run smoke test query

---

## How to Use These Skills

### Method 1: Direct Invocation
```
"Execute Skill: Safe Schema Update for adding a last_contacted_at field to leads table"
```

### Method 2: Context Loading
At session start, read this file to load all skills into context.

### Method 3: Linked from CLAUDE.md
Add this to your `CLAUDE.md`:
```markdown
## 🧠 Agent Skills
Defined in `.agent/skills/agent-skills-repository/SKILL.md`. Execute with "Run Skill: [Name]":
- Safe Schema Update
- Safe Service Implementation
- Green-Light Feature Dev (TDD)
- Full MCP Swarm Deployment
- New Automation Workflow
- CRM Adapter Implementation
- Session Audit
- Database Migration Execution
```
