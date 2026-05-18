#!/usr/bin/env bash
# Verify required files exist in dist/ before npm publish.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT/dist"

echo "Verifying required files exist in dist/..."
ls -la
echo ""

[ -f "README.md" ]    || { echo "ERROR: README.md missing";    exit 1; }
echo "✓ README.md"
[ -f "cli.mjs" ]      || { echo "ERROR: cli.mjs missing";      exit 1; }
echo "✓ cli.mjs"
[ -f "package.json" ] || { echo "ERROR: package.json missing"; exit 1; }
echo "✓ package.json"

BIN_PATH=$(node -p "require('./package.json').bin['create-ekko-app']")
echo "bin.create-ekko-app: $BIN_PATH"
[ -f "$BIN_PATH" ] || { echo "ERROR: bin file $BIN_PATH missing"; exit 1; }
echo "✓ $BIN_PATH"

echo ""
echo "All files verified successfully!"
