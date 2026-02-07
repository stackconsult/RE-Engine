---
name: cicd-orchestration
description: Blueprint for setting up GitHub Actions pipelines and Docker-based infrastructure for production deployments.
---

# CI/CD Orchestration Skill

This skill provides the instructions and templates for automating the build, test, and deployment lifecycle of the RE-Engine.

## Objective
Implement a fully automated pipeline that ensures code quality (lint, typecheck), verifies logic (unit/integration tests), and packages the application as Docker containers for reliable production deployment.

## 🛠️ Implementation Guide

### 1. Dockerization
Create `Dockerfile` entries for the core engine and MCP servers.

**Engine Dockerfile (`engine/Dockerfile`):**
```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
RUN npm install --production
CMD ["node", "dist/index.js"]
```

### 2. GitHub Actions Workflow (`.github/workflows/production.yml`)
Define the multi-stage pipeline.

```yaml
name: Production Pipeline

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: npm install
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test

  build-and-push:
    needs: verify
    if: github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build Engine Image
        run: docker build -t reengine-core ./engine
      # Add push to Registry (GHCR/ECR) steps here
```

### 3. Environment Parity
Use `docker-compose.prod.yml` to test the production setup locally.

```yaml
services:
  engine:
    build: ./engine
    environment:
      - NODE_ENV=production
    env_file: .env.production
    restart: always
  
  mcp-vertex:
    build: ./mcp/reengine-vertexai
    # ...
```

## ⚠️ Best Practices
- **Layer Caching**: Structure Dockerfiles to take advantage of layer caching (copy package.json before source).
- **Multi-stage Builds**: Always use multi-stage builds to keep production images small and secure.
- **Secrets Management**: Never use `env_file` for sensitive secrets in real production; use GitHub Secrets and inject them into the deployment process.
