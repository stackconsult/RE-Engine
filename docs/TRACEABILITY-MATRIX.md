# RE Engine — Requirements Traceability Matrix

This matrix maps **REengine-readme.md** requirements → **our repo implementation** (files in `BrowserOs/`) and highlights gaps.

Legend:
- ✅ Implemented (code exists)
- 🟡 Partially (docs/scaffold exists, core missing)
- ❌ Missing

---

## 0) Global safety + secrets
| Requirement (REengine-readme) | Implementation | Status | Notes / gaps |
|---|---|---:|---|
| Never put passwords/API keys in repo; use env vars | `.gitignore`, `AGENTS.md`, `.windsurf/rules/security-and-secrets.md` | ✅ | Need runtime secret-loading conventions in code + redaction in logs everywhere. |
| Approval-first outbound across all channels | `.windsurf/rules/approval-first-sending.md`, `engine/src/router/routerService.ts` | 🟡 | Router enforces `status===approved` in TS, but no end-to-end adapter implementations yet. |
| 2FA/CAPTCHA cannot be solved automatically (human gate) | `docs/PLAYWRIGHT-HUMAN-BROWSER-AGENT.md`, `AGENTS.md` | 🟡 | Need Playwright runtime detection + explicit pause/hand-off mechanism in code. |

---

## 1) Workspace + install
| Requirement | Implementation | Status | Notes / gaps |
|---|---|---:|---|
| Node v22+ required | `docs/NODE-INSTALL.md`, scripts guard rails | ✅ | Machine currently missing node/npm; must install to run. |
| OpenClaw installation + onboard + doctor | `REengine-readme.md` | 🟡 | Not implemented as automation scripts in this repo yet; need `docs/REENGINE-OPENCLAW-INTEGRATION.md` + ops scripts. |

---

## 2) Data storage (CSV first)
| Requirement | Implementation | Status | Notes / gaps |
|---|---|---:|---|
| `leads.csv`, `approvals.csv`, `events.csv`, `dnc.csv`, `contacts.csv` strict headers | `docs/REENGINE-DATA-MODEL.md`, `engine/src/store/csv/csvHeaders.ts`, `engine/src/store/csv/csvStore.ts` | 🟡 | CSV parsing is simplistic (no quoted commas). Need robust CSV library + file locking. |
| Atomic writes | `engine/src/store/csv/csvIO.ts` | ✅ | Uses temp file + rename. Need cross-process lock to prevent concurrent cron overlap. |
| Upgrade path CSV → Neon Postgres | `docs/BUILD-PLAN.md`, `docs/RUNBOOKS.md` | ❌ | Need PostgresStore implementation + migrations + config. |

---

## 3) Channels
| Requirement | Implementation | Status | Notes / gaps |
|---|---|---:|---|
| WhatsApp pairing + allowlists | `REengine-readme.md`, docs references | ❌ | Need actual `~/.openclaw/openclaw.json` templates + validation scripts + OpenClaw integration doc. |
| Telegram bot + pairing | `REengine-readme.md` | ❌ | Same; plus a safe alert target config pattern for prod. |
| Email SMTP + IMAP (SpaceEmail env vars) | `REengine-readme.md` | ❌ | Need TS adapters OR Python runtime scripts. Current TS engine has no SMTP/IMAP modules. |
| LinkedIn/Facebook semi-auto via OpenClaw browser | `engine/src/router/routerService.ts` (approved_opened), docs | 🟡 | Need OpenClaw browser command adapter + mark_sent_manual equivalent flow. |

---

## 4) Approval model
| Requirement | Implementation | Status | Notes / gaps |
|---|---|---:|---|
| approvals.csv pending → approved → sent/failed (+ social approved_opened/sent_manual) | `docs/REENGINE-WORKFLOWS.md`, `engine/src/domain/types.ts`, `engine/src/router/routerService.ts`, `engine/src/approvals/approvalService.ts` | 🟡 | Missing edit/reset-to-pending, reject reason semantics, and CLI/skill integration. |
| Web dashboard/WebChat approval steps | `docs/AGENT-INSTRUCTIONS.md`, `REengine-readme.md` | ❌ | Need OpenClaw WebChat skill commands or a dedicated UI + documented procedure. |

---

## 5) Scripts / jobs required by REengine
| Requirement | Implementation | Status | Notes / gaps |
|---|---|---:|---|
| draft_daily_outreach (150/day) | `REengine-readme.md` | ❌ | Need TS implementation + templates + DNC + lead status updates. |
| poll_imap_replies | `REengine-readme.md` | ❌ | Need IMAP ingestion in TS or keep Python; currently not built. |
| send_approved_router | `engine/src/router/routerService.ts` | 🟡 | Router exists but adapters missing (email/WA/TG/OpenClaw browser open). |
| WA/TG hot scan sessions | `REengine-readme.md` | ❌ | Need OpenClaw `sessions_*` integration (or MCP server) + contact capture logic. |
| Social ingest snapshot-first (no OCR) | `docs/REENGINE-WORKFLOWS.md` | ❌ | Need actual browser snapshot ingestion and storage (identities/handles/inbox_items). |

---

## 6) Cron jobs
| Requirement | Implementation | Status | Notes / gaps |
|---|---|---:|---|
| Exact cron jobs (America/Edmonton) | `REengine-readme.md` | ❌ | Need `docs/REENGINE-OPENCLAW-INTEGRATION.md` + scripts to install cron jobs safely. |

---

## 7) Windsurf Cascade control plane
| Requirement | Implementation | Status | Notes / gaps |
|---|---|---:|---|
| Skills (SKILL.md) | `.windsurf/skills/*/SKILL.md`, `docs/WINDSURF-SKILLS.md` | ✅ | Skills exist; need richer resources + step-by-step runbooks per skill. |
| Rules (Always On etc.) | `.windsurf/rules/*`, `docs/WINDSURF-RULES.md` | ✅ | Add more rules: tool budgeting, PR discipline, data retention. |
| AGENTS.md scoping | `AGENTS.md`, `docs/WINDSURF-AGENTS.md` | ✅ | Consider adding `engine/AGENTS.md`, `playwright/AGENTS.md`, `docs/AGENTS.md` for tighter scoping. |
| MCP config guidance | `docs/WINDSURF-MCP.md` | ✅ | Need actual MCP servers implemented in `mcp/*`. |

---

## 8) Playwright “human browser” system
| Requirement | Implementation | Status | Notes / gaps |
|---|---|---:|---|
| Self-healing, artifacts, tracing | `docs/PLAYWRIGHT-HUMAN-BROWSER-AGENT.md` | 🟡 | Code exists only as a minimal runner; missing healing, traces, artifact mgmt, state handling. |

---

# Highest Priority Gaps (must fix for real production)
1) Install Node + npm (required to run anything).
2) Implement channel adapters (email/WA/TG/social open) and enforce approval-only sends.
3) Implement robust CSV parsing + cross-process locking.
4) Implement OpenClaw integration layer (cron install, message send wrapper, browser open/snapshot wrapper).
5) Implement MCP servers (reengine-core, reengine-browser, integrations) with strict schemas.
6) Implement Playwright self-healing + trace pipeline.
7) Implement inbound ingest (IMAP + sessions + social snapshot ingest).
