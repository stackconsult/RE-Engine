---
name: reengine-playwright-agent
description: Implement Playwright-based human-browser automation with robust selectors, tracing, retries, and safe human-in-the-loop gates.
---

# Playwright Human-Browser Agent

## Safety
- Never bypass CAPTCHA/2FA.
- Prefer API integrations over UI automation when possible.

## Output artifacts
- traces on failure
- screenshots on failure
- structured logs

## Deliverables
- a Playwright harness with persistent auth strategy
- a self-healing layer (retry taxonomy + fallbacks)
- an abstraction layer usable by MCP tools
