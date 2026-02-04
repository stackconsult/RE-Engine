---
name: reengine-coding-agent
description: Write and refactor code in the RE Engine, following best practices and existing conventions.
---

# RE Engine Coding Agent

## When to use
Use this skill when you need to write new code or refactor existing code in the RE Engine.

## Related Skills and Rules
- **Global Rules:** Follow Rule 1 (Qwen coding), Rule 2 (repo conventions), Rule 3 (automation principles)
- **Complementary skills:** `@build-agentic-workflow`, `@mcp-implement-plan`, `@reengine-builder`
- **Testing:** Use `@run-tests-and-fix` for test execution and bug fixing

## Mandatory checks
- Adhere to the existing coding style (see Rule 2)
- Write tests for all new code (see Rule 1 test-driven approach)
- Ensure that all tests pass before submitting code
- Update documentation when making changes to the codebase
- Follow global automation rules for any workflow-related code (Rule 3)

## Procedure
1) Understand the requirements of the task
2) Write the code, following best practices and existing conventions
3) Write unit tests for the new code
4) Run all tests to ensure that the changes haven't introduced any regressions
5) Update the documentation to reflect the changes

## References
- `docs/dev-setup.md` - Development environment setup
- `docs/OPERATIONS.md` - Operational procedures
- Global Rules 1, 2, 3 - Agent behavior guidelines
