---
description: The Opus Operator Meta-Workflow - 5-Phase protocol for safe, efficient, cost-managed development
---
// turbo-all

# Opus Operator Workflow (v1.0)

**Objective:** Execute tasks on the RE-Engine repository safely, efficiently, and cheaply while strictly managing API costs and context quality.

---

## Phase 1: The Safety Valve (Cost & Context Governance)

*Run immediately upon session start.*

### 1. Budget Checkpoint
- **Check**: Review current usage and session costs
- **Rule**: If session cost exceeds **$5.00**, PAUSE and request human authorization
- **Action**: If `Projected_Task_Complexity` > "Medium", confirm available budget

### 2. Context Hygiene
- **Action**: Execute `/compact` immediately if previous context exists
- **Constraint**: Do not load large files (`package-lock.json`, `events.csv`) unless explicitly analyzing them
- **Tip**: Use `ls -R` or `grep` first to identify relevant files

---

## Phase 2: The Brain Implant (CLAUDE.md Initialization)

*Context Loading.*

1. **Scan**: Check root for `CLAUDE.md`
2. **Action**: If missing or outdated, generate/update using the RE-Engine Standard Template
3. **Memory Load**: Read `CLAUDE.md` to load architecture rules and tech stack context

### RE-Engine Standard Template
```markdown
# Project: RE-Engine (Real Estate Automation Stack)

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
```

---

## Phase 3: The "USB-C" Connection (MCP Setup)

*Tool connection logic based on project analysis.*

1. **Analyze**: Read `package.json` dependencies
2. **Connect**:
   - `pg` / `prisma` detected? → Connect `postgres-mcp` (Read-Only first)
   - `puppeteer` / `playwright` detected? → Connect `puppeteer-mcp` or `fetch`
   - `git` detected? → Connect `github-mcp`
3. **Verify**: Run `/mcp` to confirm active connections before attempting tasks

---

## Phase 4: The Execution Loop (Analyze → Plan → Scale)

*Strict loop to prevent token burn.*

### Step A: Analysis (Low Cost)
- **Prompt**: "Read @README.md and @src/index.ts. Explain [specific mechanism] briefly."
- **Goal**: Load memory cheaply without modifying files

### Step B: The Architect Pause (Checkpoint)
- **Prompt**: "Draft a bullet-point plan to [Task Name]. **Do not write code yet.**"
- **Action**: **STOP** for Human Review
- **Why**: It costs pennies to fix a plan, but dollars to fix code

### Step C: Execution Swarm (High Cost)
- **Prompt**: "Execute Step 1. Run tests immediately after: `npm test`."
- **Error Protocol**:
  - If `Test == Fail`: Revert changes (`git checkout .`), read error, retry **ONCE**
  - If `Test == Fail (2nd time)`: **ABORT** and notify human (prevents infinite error loops)

---

## Phase 5: Skill Crystallization

*Post-task automation.*

1. **Review**: Did we solve a novel problem (e.g., "Fixing a Neon DB connection timeout")?
2. **Crystallize**: Convert the solution into a reusable **Skill** and append it to `.agent/skills/`
3. **Document**: Update relevant workflow or skill files for future use

---

## Command Reference

| Phase | Action / Command | Purpose |
|-------|------------------|---------|
| **Start** | `claude` | Initialize CLI |
| **Safe** | `/compact` | Reduce context cost |
| **Brain** | Read `CLAUDE.md` | Load project memory |
| **Link** | `/mcp connect [server]` | Connect DB/Tools |
| **Plan** | "Create a plan for X" | Low-cost architecture check |
| **Act** | "Edit @file to implement X" | High-cost execution |
| **Reset** | `/clear` | Dump context after task completion |

---

## How to Use

1. **Initialize**: At session start, invoke this workflow
2. **Run Phase 1**: Check budget and compact context
3. **Run Phase 2**: Verify CLAUDE.md exists and is current
4. **Run Phase 3**: Connect required MCP tools
5. **Run Phase 4**: Follow the Analyze → Plan → Execute loop
6. **Run Phase 5**: Crystallize learnings into skills
