#!/usr/bin/env bash
# Commit and push version bump as github-actions[bot]. Requires VERSION env.

set -e

VERSION="${VERSION:?VERSION is required}"

git config user.name "github-actions[bot]"
git config user.email "github-actions[bot]@users.noreply.github.com"
git add .github/package.json

if git diff --staged --quiet; then
    echo "package.json already at $VERSION - nothing to commit"
    exit 0
fi

git commit -m "chore: bump version to $VERSION [skip ci]"
git push
