#!/usr/bin/env bash
# Check package info and npm registry status before publish. Requires VERSION.

set -e

VERSION="${VERSION:?VERSION is required}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT/dist"

PACKAGE_NAME=$(node -p "require('./package.json').name")

echo "Package: $PACKAGE_NAME@$VERSION"
echo "Registry: $(npm config get registry)"

if npm view "$PACKAGE_NAME" version 2>/dev/null; then
  echo "Package exists on npm"
  npm view "$PACKAGE_NAME@$VERSION" version 2>/dev/null \
    && echo "Version $VERSION already published" \
    || echo "Version $VERSION not found - will publish"
else
  echo "Package does not exist on npm - first time publish"
fi
