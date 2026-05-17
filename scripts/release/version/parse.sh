#!/usr/bin/env bash
# Parse semantic version (x.y.z) from text. Writes version to GITHUB_OUTPUT.

MSG="${COMMIT_MSG:-}"

if [[ "$MSG" =~ ([0-9]+\.[0-9]+\.[0-9]+) ]]; then
    echo "version=${BASH_REMATCH[1]}" >> "$GITHUB_OUTPUT"
    echo "Version: ${BASH_REMATCH[1]}"
else
    echo "version=" >> "$GITHUB_OUTPUT"
    echo "No version found - skipping release"
fi
