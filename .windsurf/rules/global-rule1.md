---
trigger: model_decision
---
Suggested title: Global Qwen Ollama Agentic Coding

# Global Qwen Ollama Agentic Coding

## Context

- **Qwen3‑Coder‑Next via Ollama API** (local OpenAI‑compatible endpoint)  
- Cascade/Windsurf **agents being responsible for installing & validating dependencies** (Ollama, model pull, language toolchains, clang/Xcode tools, etc.)  
- A package you can **copy‑paste** into your global + repo config and tweak names/paths.

## Model usage policy

- Default to the `ollama-qwen3-coder-next` model profile when:
  - There are failing tests, runtime errors, or production bugs.
  - The task touches multiple modules, services, or cross-cutting concerns.
  - The task requires understanding large parts of the repo or long logs.
- Use lighter / non-agentic models when:
  - Performing small, localized edits in a single file.
  - Doing documentation-only or comment-only changes with no code impact.

## Environment expectations (Ollama + toolchains)

- Before running Qwen3‑Coder‑Next for real work:
  - Ensure `ollama` is installed and on PATH.
  - Ensure the `qwen3-coder-next` model is available locally (`ollama pull qwen3-coder-next`).
  - Ensure required language runtimes/build tools are installed, including when applicable:
    - Node.js / npm / pnpm / yarn for JS/TS projects.
    - Python + pip/uv/poetry for Python projects.
    - Go toolchain for Go projects.
    - Clang / Xcode Command Line Tools or platform build tools for native/compiled code.
- The agent MUST:
  - Check for these dependencies.
  - If missing, propose explicit installation steps and ask for confirmation before running commands.
  - Document the final dev environment in `docs/dev-setup.md`.

## How to drive Qwen via Ollama

- Always work in an explicit agent loop:
  1. Reproduce or define the failure using automated tests where possible.
  2. Provide the `ollama-qwen3-coder-next` model with:
     - Failing test output and stack traces.
     - The smallest set of relevant files plus key docs (ARCHITECTURE.md, OPERATIONS.md, FLOWS.md, etc.).
     - Clear success criteria (which tests must pass, constraints, performance/security expectations).
  3. Have Qwen:
     - Propose a minimal plan BEFORE editing code.
     - Apply changes in small, reviewable chunks.
     - Re-run tests after each significant change.
  4. Iterate: update the plan if the situation changes, then keep the loop running until tests pass or a hard blocker appears.

## Bugfix expectations (Qwen bugfix loop)

- Every bugfix driven by Qwen MUST:
  - Reproduce the issue with a test first (new or updated).
  - Apply the smallest code change that fixes the bug.
  - Add or update at least one test that fails before the fix and passes after.
  - Run the full bugfix loop workflow (see `qwen-bugfix-loop` in .windsurfworkflows.md).

## Refactor / migration expectations

- For large refactors or migrations:
  - Qwen must draft or update a plan in `docs/plans/` (e.g., `docs/plans/refactor-<id>.md`).
  - External behavior is preserved unless explicitly instructed otherwise.
  - Risky changes and rollback strategy are described in the plan.
  - Full test suite is run, and security/hardening checks are applied before considering the refactor complete.

## Production build requirements

- For production builds, ensure:
  - All optimizations are enabled (e.g., NODE_ENV=production, Python -O, Go build flags).
  - Source maps and debug information are handled according to security policy.
  - Build artifacts are properly versioned and checksummed.
  - Security scanning is performed on build outputs.
  - Container images (if applicable) are built with minimal base images and scanned for vulnerabilities.

## Safety & installation behavior

- The agent is allowed to:
  - Install missing project dependencies (npm/pip/poetry/uv/etc.) and run language-specific setup commands.
  - Propose installation of system-level tools (Ollama, Qwen model pull, clang/Xcode tools), but MUST:
    - Explicitly state what commands it wants to run.
    - Ask for approval before running them.
- The agent must NOT:
  - Modify OS configuration or security settings without explicit, informed confirmation.
  - Skip test runs or security checks when making non-trivial code changes.

## Summary

- Use `ollama-qwen3-coder-next` for any serious coding/bugfix/refactor work.
- Ensure Ollama, Qwen3‑Coder‑Next, runtimes, and build tools are installed and documented.
- Always follow a test-driven, plan-first, minimal-change loop with Qwen as the coding engine.
- Adhere to production build requirements for any deployment-related changes.
