---
description: Build, test, auto-revert on failure, commit on success
---

# Build-Test-Commit Workflow

Safe deployment workflow with automatic rollback on failure.

// turbo-all

## Steps

1. Get current commit hash for rollback reference
```bash
git rev-parse HEAD
```

2. Build the project
```bash
cd engine && npm run build
```

3. Run tests
```bash
npm test
```

4. **On Success**: Commit and tag
```bash
git add -A
git commit -m "chore: build verified"
git tag -a v$(date +%Y%m%d-%H%M%S) -m "Build verified"
```

5. **On Failure**: Revert to last working state
```bash
git checkout -- .
git clean -fd
```

## Automated Script

Save as `scripts/safe-deploy.sh`:

```bash
#!/bin/bash
set -e

ROLLBACK_COMMIT=$(git rev-parse HEAD)
echo "📍 Rollback point: $ROLLBACK_COMMIT"

echo "🔨 Building..."
cd engine && npm run build || {
    echo "❌ Build failed, reverting..."
    git checkout -- .
    git clean -fd
    exit 1
}

echo "🧪 Testing..."
npm test || {
    echo "❌ Tests failed, reverting..."
    git checkout -- .
    git clean -fd
    exit 1
}

echo "✅ Success! Committing..."
git add -A
git commit -m "chore: build verified $(date +%Y-%m-%d)" || echo "Nothing to commit"
echo "🎉 Deploy ready"
```

## Usage

```bash
chmod +x scripts/safe-deploy.sh
./scripts/safe-deploy.sh
```
