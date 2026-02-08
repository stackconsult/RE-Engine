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
1. **Analyze**: Locate migration files (e.g., `migrations/*.sql`, `prisma/schema.prisma`).
2. **Safety Check**: 
   - Ask: "Does this delete data?" (If yes, STOP).
   - Check: Are there dependent types/models?
3. **Execute**:
   - Create migration file with timestamp/slug.
   - Use idempotent SQL (`IF NOT EXISTS`).
   - If multi-tenant, ensure `tenant_id` context is preserved.
4. **Verify**:
   - Run type checking (e.g., `npm run typecheck`).
   - Verify DB connection.

---

## Skill 2: Robust Service Implementation
**Trigger**: User asks to "create service", "add logic", "implement business rule".
**Philosophy**: Defensiveness & Observability.

### Protocol:
1. **Scaffold**: Create file following project patterns (`*.service.ts`, `*.go`).
2. **Context Check**:
   - **Multi-Tenancy**: MUST scope by Tenant ID.
   - **Logging**: MUST inject Logger.
3. **Error Handling**:
   - Wrap public methods in `try/catch`.
   - Log specific errors, not just generic messages.
4. **Verify**:
   - Run linter/type-checker.

---

## Skill 3: Test-Driven Feature (Green-Light)
**Trigger**: User asks to "implement feature", "add functionality", "fix bug".
**Philosophy**: Test First.

### Protocol:
1. **Scaffold Test**: Create a test file (`*.test.ts`, `*_test.go`) *before* implementation.
2. **Red State**: Write a test case that replicates the requirement/bug and FAILS.
3. **Implement**: Write minimal code to pass the test.
4. **Green State**: Run test to verify PASS.
5. **Refactor**: Clean up code while keeping test Green.

---

## Skill 4: Tooling & Infrastructure Deployment
**Trigger**: User asks to "rebuild tools", "update MCP", "deploy infrastructure".

### Protocol:
1. **Clean**: Remove stale artifacts (`dist/`, `build/`).
2. **Build**: Run build commands for all affected packages.
3. **Config**: Verify configuration paths/envs align with new build.
4. **Restart**: Explicitly tell user to restart their environment/host.

---

## Skill 5: Safe Automation Workflow
**Trigger**: User asks to "automate X", "create workflow", "connect trigger".

### Protocol:
1. **Trigger Definition**: Validate incoming payloads (signatures, schemas).
2. **Action Definition**: Isolate business logic from trigger code.
3. **Safety Gate**:
   - **Outbound Check**: If sending messages/money, ADD AN APPROVAL STEP.
   - **Rate Limit**: implementation protection.
4. **Wiring**: Connect trigger to action via router/config.

---

## Skill 6: External Integration (Adapter Pattern)
**Trigger**: User asks to "integrate [Service]", "connect [API]", "sync with [Provider]".

### Protocol:
1. **Adapter Interface**: Define a generic interface (e.g., `CRMAdapter`) first.
2. **Implementation**: Create specific provider class (e.g., `ZillowAdapter`).
3. **Resilience**:
   - Implement exponential backoff for rate limits.
   - Handle auth token refresh automatically.
4. **Isolation**: Verification tests must mock the external API.

---

## Skill 7: Session Audit & Hygiene
**Trigger**: User says "prepare commit", "wrap up", "audit".

### Protocol:
1. **Cleanup**: Delete temp files (`temp.*`, `debug.log`).
2. **Quality Check**: Run lint and type-check.
3. **Summary**: Generate a concise bullet-point summary of changes.
4. **Commit Suggestion**: Propose a conventional commit message.

---

## Skill 8: Migration Execution
**Trigger**: User says "run migrations", "apply changes".

### Protocol:
1. **Backup**: Suggest/Check for backup.
2. **Dry Run**: If possible, inspect SQL/Plan.
3. **Execute**: Run migration command.
4. **Smoke Test**: Query the DB to verify new schema elements exist.
