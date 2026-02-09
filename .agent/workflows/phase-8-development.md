---
description: Phase 8 development workflow for advanced features implementation
---

# Phase 8 Development Workflow

Systematic workflow for implementing advanced enterprise features.

// turbo-all

## Pre-Implementation

1. Read the relevant skill documentation
```bash
cat .agent/skills/{feature-name}/SKILL.md
```

2. Check for existing implementations
```bash
grep -r "FeatureName" engine/src/
```

## Implementation Order

### 1. i18n (Foundation)
```bash
# Create directory structure
mkdir -p engine/src/i18n/locales

# Create service
touch engine/src/i18n/i18n.service.ts
touch engine/src/i18n/i18n.middleware.ts

# Create locale files
echo '{}' > engine/src/i18n/locales/en.json
echo '{}' > engine/src/i18n/locales/es.json

# Build and test
npm run build && npm test
```

### 2. Reporting
```bash
# Create directory
mkdir -p engine/src/reporting/templates

# Create services
touch engine/src/reporting/report.service.ts
touch engine/src/api/routes/reports.routes.ts

# Build and test
npm run build && npm test
```

### 3. Webhooks
```bash
# Create directory
mkdir -p engine/src/integrations/adapters

# Create services
touch engine/src/integrations/webhook.service.ts
touch engine/src/database/migrations/010_webhooks.sql

# Build and test
npm run build && npm test
```

### 4. White-Label
```bash
# Create services
touch engine/src/whitelabel/branding.service.ts
touch engine/src/database/migrations/011_whitelabel.sql

# Build and test
npm run build && npm test
```

### 5. SSO
```bash
# Create directory
mkdir -p engine/src/auth/sso

# Create services
touch engine/src/auth/sso/saml.service.ts
touch engine/src/auth/sso/oidc.service.ts
touch engine/src/database/migrations/012_sso_config.sql

# Build and test
npm run build && npm test
```

## Post-Implementation

1. Run full test suite
```bash
npm test
```

2. Update README
```bash
# Document new features in Phase 8 section
```

3. Commit with conventional commits
```bash
git add -A
git commit -m "feat(phase8): add {feature-name}"
```

4. Push to main
```bash
git push origin main
```
