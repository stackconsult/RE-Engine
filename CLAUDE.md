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
| **Automation Flow** | "workflow", "trigger", "automate", "webhook" |
| **Session Audit** | "commit", "finish", "done" |

---

## 🛠 Tech Stack
- **Runtime**: Node.js v22 (ES Modules)
- **Language**: TypeScript 5.7
- **Database**: PostgreSQL (Neon/Supabase) via PgVector
- **AI**: Google Vertex AI (Gemini), Ollama (Local Llama 3/Qwen)
- **Testing**: Jest / Playwright (E2E)
- **Orchestration**: MCP Servers

## 🏗 Architecture Rules
1. **No Direct DB Access**: All database operations must go through `src/services/` or `src/database/`. Never write SQL in controllers.
2. **Safety First**: All external API calls must have `try/catch` blocks and retry logic.
3. **Approval Workflow**: Outbound messages require an entry in `approvals` table. Never bypass the approval queue.
4. **Multi-Tenancy**: All database operations MUST include `tenantId` parameter.
5. **Secrets**: Never output `.env` values or API keys in the chat.

## 🚀 Common Commands
- **Build Core**: `npm run build`
- **Typecheck**: `npm run typecheck`
- **Test All**: `npm test`
- **Start Dev**: `npm run dev`
- **Lint**: `npm run lint`

## ⚠️ "Do Not Touch" Zones
- `config/auth.ts`: Security critical. Ask before modifying.
- `.env`: Do not edit directly; propose changes to `.env.example`.
