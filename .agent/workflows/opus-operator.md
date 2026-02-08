---
description: Universal Opus Operator Workflow - 5-Phase protocol for safe, efficient software development
---
// turbo-all

# Universal Opus Operator Workflow (v2.0)

**Objective:** Execute software development tasks safely, efficiently, and with high context awareness.

---

## Phase 1: Context & Governance

*Run immediately upon session start.*

### 1. Complexity Assessment
- **Check**: Estimate the complexity of the requested task (Low/Medium/High).
- **Rule**: If High complexity, strictly enforce the "Architect Pause" (Phase 4, Step B).

### 2. Context Cleanup
- **Action**: Execute `/compact` if available/needed to reduce context window usage.
- **Constraint**: Do not read large lockfiles or data files (`package-lock.json`, `.csv`) unless explicitly analyzing them.

---

## Phase 2: Knowledge Loading (The "Brain")

*Load project-specific context and memory.*

1. **Scan**: Check root for `CLAUDE.md` or `README.md`.
2. **Action**: If `CLAUDE.md` exists, read it immediately to load architecture rules, tech stack, and **Project Skills**.
3. **Missing Brain?**: If `CLAUDE.md` is missing, PROPOSE generating one based on the project structure (Language, Framework, DB).

---

## Phase 3: Tool Connection (MCP Setup)

*Dynamically connect external tools based on project needs.*

1. **Analyze**: Read `package.json`, `go.mod`, or `requirements.txt`.
2. **Connect**:
   - **Database**: If Postgres/MySQL detected → Connect relevant DB MCP.
   - **Browser**: If UI/E2E tests detected → Connect Browser/Puppeteer MCP.
   - **Git**: Always ensure Git MCP is active.
3. **Verify**: Confirm tools are active before proceeding.

---

## Phase 4: The Execution Loop (Analyze → Select Skill → Plan → Execute)

*The core loop for reliable execution.*

### Step A: Analysis
- **Prompt**: "Read relevant documentation and source files. Explain the current mechanism."
- **Goal**: Understand the system *before* changing it.

### Step B: Skill Selection (Auto-Pickup)
- **CRITICAL**: Review `.agent/skills/agent-skills-repository/SKILL.md`.
- **Logic**: Does the user's request match a **Skill Trigger**?
  - *Example*: "Update DB" matches "Safe Schema Update" skill.
  - *Example*: "New feature" matches "Green-Light Feature Dev" skill.
- **Action**: If a match is found, **YOU MUST ADOPT THAT SKILL'S PROTOCOL**. Explicitly state: *"Activiting Skill: [Name]"*.

### Step C: The Architect Pause
- **Action**: Draft a bullet-point plan. **Do not write code yet.**
- **Checkpoint**: If task is complex, stop and ask: *"Does this plan look correct?"*

### Step D: Execution
- **Action**: Implement the plan.
- **Testing**: Run tests *immediately* after changes.
- **Recovery**: If tests fail, revert or fix *once*. If failure persists, **STOP** and re-assess.

---

## Phase 5: Knowledge Crystallization

*Continuous improvement.*

1. **Review**: Did you solve a novel problem or fix a tricky bug?
2. **Crystallize**: Create a new Skill entry in `.agent/skills/` for future agents.
3. **Update**: Add the new skill to `CLAUDE.md` triggers.

---

## Command Reference

| Phase | Action | Purpose |
|-------|--------|---------|
| **Start** | `ls -R` | Explore project structure |
| **Brain** | Read `CLAUDE.md` | Load project memory & rules |
| **Skill** | Read `SKILL.md` | Select auto-pickup protocol |
| **Plan** | "Draft Plan" | Prevent architectural drift |
| **Act** | "Edit File" | Execute changes |
| **Test** | `npm test` | Verify immediately |
