#!/usr/bin/env bash
# Update version in .github/package.json. Requires VERSION env.

set -e

VERSION="${VERSION:?VERSION is required}"

node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('.github/package.json', 'utf8'));
pkg.version = process.env.VERSION;
fs.writeFileSync('.github/package.json', JSON.stringify(pkg, null, 2) + '\n');
"
echo "Updated .github/package.json to version $VERSION"
