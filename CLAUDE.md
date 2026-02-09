# Project: RE-Engine (Real Estate Automation Stack)

## 🧠 Agent Memory & Skills
**SYSTEM INSTRUCTION**: The Agent MUST check this file at the start of every session.

### ⚡️ Active Skills (Auto-Pickup)
The following skills are installed in `.agent/skills/agent-skills-repository/SKILL.md`.
**IF** the user request matches a Trigger, **THEN** execute the Protocol.

| Skill Name | Triggers (Keywords) |
|------------|---------------------|
| **Safe Schema Update** | "migrate", "schema", "add column", "new table" |
| **Robust Service** | "new service", "business logic", "controller" |
| **Green-Light TDD** | "fix bug", "implement feature", "add capability" |
| **Adapter Pattern** | "integrate", "sync", "api", "external provider" |
| **Isolation Audit** | "isolate", "tenant", "security", "check data" |
| **Automation Flow** | "workflow", "trigger", "automate", "webhook" |
| **Session Audit** | "commit", "finish", "done" |

---

## 🏗 Architecture Rules (Updated)
1. **Adapter Pattern**: All CRM and external integrations MUST use the adapter structure in `src/integrations/adapters/`.
2. **Property Service**: All property-related DB operations MUST go through `PropertyDatabaseService`.
3. **No Direct DB Access**: All other DB operations go through `UnifiedDatabaseManager`. Never write SQL in controllers.
4. **Multi-Tenancy**: All DB operations MUST include `tenant_id`.
5. **Approval Workflow**: Outbound messages require an entry in `approvals` table. Never bypass.
6. **Safety First**: External API calls must have `try/catch` and retry logic.

## 🛠 Tech Stack
- **Runtime**: Node.js v22 (ES Modules)
- **Language**: TypeScript 5.7
- **Database**: PostgreSQL (Neon/Supabase) via PgVector
- **Testing**: Jest / Playwright

## 🚀 Common Commands
- **Build**: `npm run build`
- **Typecheck**: `npm run typecheck`
- **Test**: `npm test`
- **Lint**: `npm run lint`
