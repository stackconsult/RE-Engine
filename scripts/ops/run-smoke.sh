#!/usr/bin/env bash
set -euo pipefail

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: node is not installed or not on PATH. Install Node.js v22+ first." >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "ERROR: npm is not installed or not on PATH. Install Node.js v22+ (npm is bundled)." >&2
  exit 1
fi

export REENGINE_DATA_DIR="${REENGINE_DATA_DIR:-./engine/data}"

echo "[reengine] smoke test using CSV store at: $REENGINE_DATA_DIR"

echo "Building engine..."
(cd engine && npm run build)

if [ ! -f "engine/dist/ops/smoke.js" ]; then
  echo "ERROR: engine/dist/ops/smoke.js not found after build." >&2
  echo "Try: (cd engine && npm run build) and verify TypeScript output is in engine/dist." >&2
  exit 1
fi

echo "Running smoke..."
node --enable-source-maps engine/dist/ops/smoke.js
