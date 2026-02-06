#!/usr/bin/env bash
set -euo pipefail

echo "[reengine] bootstrap"

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: node is not installed or not on PATH. Install Node.js v22+ first." >&2
  echo "Suggested: https://nodejs.org or use nvm (recommended)." >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "ERROR: npm is not installed or not on PATH. Install Node.js v22+ (npm is bundled)." >&2
  exit 1
fi

NODE_V="$(node -v | tr -d 'v')"
NODE_MAJOR="${NODE_V%%.*}"

echo "Detected node: v${NODE_V}"
echo "Detected npm:  $(npm -v)"

if [ "${NODE_MAJOR}" -lt 22 ]; then
  echo "ERROR: Node.js v22+ is required. Detected v${NODE_V}." >&2
  exit 1
fi

echo "Installing engine deps..."
(cd engine && npm install)

echo "Installing playwright deps..."
(cd playwright && npm install)

echo "Installing playwright browsers..."
(cd playwright && npx playwright install)

echo "Done."
