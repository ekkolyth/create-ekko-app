#!/usr/bin/env bash
# Build Go binaries to dist/bin/ for darwin/linux × amd64/arm64 and stage npm files.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

cd "$REPO_ROOT"

mkdir -p dist/bin

VERSION=$(node -p "require('./.github/package.json').version")
LDFLAGS="-X main.version=$VERSION"

CGO_ENABLED=0 GOOS=darwin GOARCH=amd64 go build -ldflags "$LDFLAGS" -o dist/bin/create-ekko-app-darwin-amd64 ./cmd/create-ekko-app
CGO_ENABLED=0 GOOS=darwin GOARCH=arm64 go build -ldflags "$LDFLAGS" -o dist/bin/create-ekko-app-darwin-arm64 ./cmd/create-ekko-app
CGO_ENABLED=0 GOOS=linux  GOARCH=amd64 go build -ldflags "$LDFLAGS" -o dist/bin/create-ekko-app-linux-amd64  ./cmd/create-ekko-app
CGO_ENABLED=0 GOOS=linux  GOARCH=arm64 go build -ldflags "$LDFLAGS" -o dist/bin/create-ekko-app-linux-arm64  ./cmd/create-ekko-app

chmod +x \
  dist/bin/create-ekko-app-darwin-amd64 \
  dist/bin/create-ekko-app-darwin-arm64 \
  dist/bin/create-ekko-app-linux-amd64 \
  dist/bin/create-ekko-app-linux-arm64

cp .github/cli.mjs .github/package.json README.md dist/

echo "✓ Built 4 binaries to dist/bin/ and staged npm files in dist/"
