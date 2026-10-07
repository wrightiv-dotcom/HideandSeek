#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
node --check game.js
node --check renderer.js
node --check ambience.js
node tests/game.test.cjs
node tests/files.test.cjs
