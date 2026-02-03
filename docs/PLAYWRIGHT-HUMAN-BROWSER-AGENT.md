# Playwright Human-Browser Agent (Production)

## Goals
- Operate as a human-like browser layer for fragile sites (LinkedIn/Facebook) and research.
- Produce deterministic artifacts (trace/screenshot/logs) for failures.

## Hard rules
- Do not bypass CAPTCHA or 2FA.
- If challenge detected, stop and request human completion.

## Reliability design
- Prefer role/label-based selectors.
- Use bounded retries with failure taxonomy.
- Capture trace on failure/first retry.

## Self-healing
- Detect common UI states (cookie banners, popups, modals).
- Implement fallback locator strategies.
- Re-auth flow when storageState invalid.

## Data protection
- Never store cookies/session state in repo.
- Redact secrets from logs.
