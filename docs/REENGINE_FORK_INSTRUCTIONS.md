# Windsurf Cascade Agent Instructions: REengine Fork Integration

This document provides a mandatory checklist for Windsurf Cascade agents to follow when integrating the REengine into a forked OpenClaw repository.

**Golden Rules (Always Adhere)**:

1.  **Never send** unless `approval.status == approved`.
2.  **Never bypass CAPTCHA/2FA**.
3.  **Never commit secrets** (tokens, cookies, creds, storageState).
4.  **Unknown WA/TG sender** => contact capture approval (no auto-reply).
5.  **Write an event record** for all meaningful actions.

---

## Pre-flight Checklist

- [ ] **Confirm you are in the forked OpenClaw repository.** The instructions in this file are for modifying the forked repository, not the original BrowserOS repository.
- [ ] **Confirm that the REengine repository is available** as a separate package, as per the "additive integration" strategy.
- [ ] **Read and understand the following documents**:
    - `docs/OPENCLAW-FORK-INTEGRATION-PLAN.md`
    - `docs/REENGINE-OPENCLAW-INTEGRATION.md`
    - `docs/BUILD-PLAN.md`
    - `docs/AGENT-INSTRUCTIONS.md`

---

## Integration Checklist

### Step 1: Update `package.json` Files

- [ ] In the `engine/` directory, update the `package.json` file:
    - [ ] Change `"private": true` to `"private": false`.
    - [ ] Change `"license": "UNLICENSED"` to an appropriate open-source license (e.g., `"license": "MIT"`).
- [ ] In the `playwright/` directory, update the `package.json` file:
    - [ ] Change `"private": true` to `"private": false`.
    - [ ] Change `"license": "UNLICENSED"` to an appropriate open-source license (e.g., `"license": "MIT"`).

### Step 2: Sanitize `REengine-readme.md`

- [ ] In the `REengine-readme.md` file, remove the example secrets.
    - [ ] Replace `PASTE_BOTFATHER_TOKEN` with a placeholder like `<YOUR_BOTFATHER_TOKEN>`.
    - [ ] Replace `YOUR_SPACEMAIL_PASSWORD` with a placeholder like `<YOUR_SPACEMAIL_PASSWORD>`.

### Step 3: Create `CONTRIBUTING.md`

- [ ] In the root of the repository, create a new file named `CONTRIBUTING.md`.
- [ ] Add the following content to the file:
    ```md
    # Contributing

    We welcome contributions to this project! Please follow these guidelines:

    1.  **Fork the repository** and create a new branch for your feature or bug fix.
    2.  **Follow the coding style** of the existing codebase.
    3.  **Write tests** for your changes.
    4.  **Submit a pull request** with a clear description of your changes.
    ```

### Step 4: Additive Integration (OpenClaw Skill)

- [ ] As per `docs/OPENCLAW-FORK-INTEGRATION-PLAN.md`, create a new OpenClaw skill for the REengine.
- [ ] In the forked OpenClaw repository, create a new directory: `skills/reengine-outreach/`.
- [ ] In the `skills/reengine-outreach/` directory, create a new file named `SKILL.md`.
- [ ] Add the following content to the `SKILL.md` file:
    ```md
    # REengine Outreach Skill

    This skill provides a set of commands for interacting with the REengine.

    ## Commands

    - `/reengine show_approvals`: Show pending approvals.
    - `/reengine approve <id>`: Approve a pending approval.
    - `/reengine reject <id>`: Reject a pending approval.
    - `/reengine run_router`: Run the approval router.
    - `/reengine run_ingest`: Run the ingest service.
    ```

### Step 5: Update `AGENTS.md`

- [ ] In the root of the forked OpenClaw repository, create or update the `AGENTS.md` file to include the following instructions:
    ```md
    # Agent Instructions

    - This repository is an integration of the REengine with OpenClaw.
    - All changes should follow the "additive integration" principle outlined in the BrowserOS documentation.
    - Do not make invasive changes to the OpenClaw core.
    - All REengine-related commands are available through the `reengine-outreach` skill.
    ```

---

## Post-flight Checklist

- [ ] **Verify that all file changes have been made correctly.**
- [ ] **Run the local quality gate scripts** (`lint`, `typecheck`, `test`, `smoke`) to ensure that the changes have not introduced any regressions.
- [ ] **Confirm that the new `reengine-outreach` skill is available** in the forked OpenClaw repository.
- [ ] **Confirm that all secrets have been removed** from the repository.

**Once all of the above steps have been completed and checked, the integration is complete.**
