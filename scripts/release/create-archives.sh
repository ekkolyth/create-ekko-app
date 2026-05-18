#!/usr/bin/env bash
# Create tar.gz archives for GitHub Release. Requires VERSION env.

set -e

VERSION="${VERSION:?VERSION is required}"

cd dist
tar -czf create-ekko-app_${VERSION}_darwin_amd64.tar.gz -C bin create-ekko-app-darwin-amd64
tar -czf create-ekko-app_${VERSION}_darwin_arm64.tar.gz -C bin create-ekko-app-darwin-arm64
tar -czf create-ekko-app_${VERSION}_linux_amd64.tar.gz  -C bin create-ekko-app-linux-amd64
tar -czf create-ekko-app_${VERSION}_linux_arm64.tar.gz  -C bin create-ekko-app-linux-arm64

echo "✓ Created 4 archives in dist/"
