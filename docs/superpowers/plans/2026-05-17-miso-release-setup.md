# Miso Release Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current tag-triggered `publish.yml` with miso's PR-title-driven 4-job release workflow, adopt miso's `scripts/` layout with `miso.json`, and add local install/uninstall scripts.

**Architecture:** Flat repo layout (no monorepo move). `.github/workflows/release.yml` listens on push-to-`main`, parses version from PR title or commit message, bumps `.github/package.json` via a `[skip ci]` bot commit, builds darwin/linux × amd64/arm64 binaries with `-ldflags "-X main.version=$VERSION"`, archives them, creates a GitHub Release, and publishes to npm via OIDC trusted publishing. Local development uses `miso <script>` invocations against `scripts/local/install.sh` and friends.

**Tech Stack:** Go (CLI), Node 22 (cli.mjs shim + npm publish), GitHub Actions, miso (script runner), bash.

**Spec:** `docs/superpowers/specs/2026-05-14-miso-release-setup-design.md`.

**Plan boundary:** This plan ends with the repo in a state ready to release. It does NOT cut a release. The user bumps versions and merges release PRs — Claude does not.

---

### Task 1: Bootstrap `miso.json` and local install/uninstall scripts

**Files:**
- Create: `miso.json`
- Create: `scripts/build/create-ekko-app.sh`
- Create: `scripts/local/install.sh`
- Create: `scripts/local/uninstall.sh`

- [ ] **Step 1: Create `miso.json`**

Write `miso.json`:

```json
{
  "$schema": "https://misojs.dev/miso.schema.json",
  "packageManager": false,
  "scripts": "./scripts"
}
```

- [ ] **Step 2: Create `scripts/build/create-ekko-app.sh`**

Write `scripts/build/create-ekko-app.sh` (no shebang, no `set -e` — miso adds `-e` automatically):

```sh
mkdir -p bin
go build -o bin/create-ekko-app ./cmd/create-ekko-app
echo "✓ Built bin/create-ekko-app"
```

- [ ] **Step 3: Create `scripts/local/install.sh`**

Write `scripts/local/install.sh`:

```sh
BINARY=${BINARY:-create-ekko-app}
GOBIN=$(go env GOBIN)
[ -z "$GOBIN" ] && GOBIN=$(go env GOPATH)/bin

sh ./scripts/build/create-ekko-app.sh

echo "Installing $BINARY to $GOBIN"
cp bin/$BINARY $GOBIN/$BINARY || exit 1
echo "✓ Installed $BINARY to $GOBIN"
```

- [ ] **Step 4: Create `scripts/local/uninstall.sh`**

Write `scripts/local/uninstall.sh`:

```sh
BINARY=${BINARY:-create-ekko-app}
GOBIN=$(go env GOBIN)
[ -z "$GOBIN" ] && GOBIN=$(go env GOPATH)/bin

rm -f $GOBIN/$BINARY
```

- [ ] **Step 5: Verify build script runs**

Run: `sh ./scripts/build/create-ekko-app.sh`
Expected: prints `✓ Built bin/create-ekko-app` and produces `bin/create-ekko-app`.

- [ ] **Step 6: Verify local install via direct sh invocation**

Run: `sh ./scripts/local/install.sh`
Expected: prints `✓ Installed create-ekko-app to <GOBIN>`. Then `which create-ekko-app` returns a path under `$GOBIN` (or `$GOPATH/bin`).

- [ ] **Step 7: Verify local uninstall**

Run: `sh ./scripts/local/uninstall.sh`
Expected: silent success. Then `which create-ekko-app` returns nothing (assuming `bin/create-ekko-app` is not on PATH).

- [ ] **Step 8: Verify miso resolves the scripts (if miso is installed)**

Run: `miso scripts`
Expected: lists `build/create-ekko-app`, `local/install`, `local/uninstall` among discovered scripts. If `miso` is not installed locally, skip and document — CI does not depend on miso.

- [ ] **Step 9: Run biome on JSON**

Run: `biome check --write miso.json`
Expected: PASS (no errors).

- [ ] **Step 10: Commit**

```sh
git add miso.json scripts/build/create-ekko-app.sh scripts/local/install.sh scripts/local/uninstall.sh
git commit -m "$(cat <<'EOF'
feat(scripts): miso.json + local install/uninstall scripts

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Update `.github/package.json` and `.github/cli.mjs` for `bin/` subdir layout

**Files:**
- Modify: `.github/package.json`
- Modify: `.github/cli.mjs`

- [ ] **Step 1: Update `.github/package.json` with `files` array**

Replace the entire content of `.github/package.json` with:

```json
{
  "name": "create-ekko-app",
  "version": "1.3.6",
  "description": "CLI for scaffolding an Ekko app with selectable framework, auth, database, and tooling.",
  "license": "MIT",
  "bin": {
    "create-ekko-app": "cli.mjs"
  },
  "files": [
    "README.md",
    "cli.mjs",
    "bin/create-ekko-app-darwin-amd64",
    "bin/create-ekko-app-darwin-arm64",
    "bin/create-ekko-app-linux-amd64",
    "bin/create-ekko-app-linux-arm64"
  ],
  "repository": {
    "type": "git",
    "url": "git+https://github.com/ekkolyth/create-ekko-app.git"
  },
  "homepage": "https://github.com/ekkolyth/create-ekko-app#readme",
  "bugs": {
    "url": "https://github.com/ekkolyth/create-ekko-app/issues"
  }
}
```

- [ ] **Step 2: Update `.github/cli.mjs` to resolve from `bin/` subdir**

Change the single line in `.github/cli.mjs`:

```js
  return join(__dirname, binaryName);
```

to:

```js
  return join(__dirname, "bin", binaryName);
```

(Use the Edit tool with that exact `old_string` → `new_string`.)

- [ ] **Step 3: Verify cli.mjs syntax**

Run: `node --check .github/cli.mjs`
Expected: PASS (no output).

- [ ] **Step 4: Run biome on JSON**

Run: `biome check --write .github/package.json`
Expected: PASS.

- [ ] **Step 5: Commit**

```sh
git add .github/package.json .github/cli.mjs
git commit -m "$(cat <<'EOF'
chore(npm): list files explicitly and resolve binary from bin/ subdir

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Release scripts — `scripts/release/version/`

**Files:**
- Create: `scripts/release/version/get-source.sh`
- Create: `scripts/release/version/parse.sh`
- Create: `scripts/release/version/update.sh`
- Create: `scripts/release/version/commit.sh`

These scripts get bash shebangs because they're invoked directly by GitHub Actions (not through miso), and they use bash-specific features (`[[ ... =~ ... ]]`).

- [ ] **Step 1: Create `scripts/release/version/get-source.sh`**

Write `scripts/release/version/get-source.sh`:

```sh
#!/usr/bin/env bash
# Get text to parse for version: PR title for merge commits, else commit message.
# Writes to GITHUB_OUTPUT when run in GitHub Actions.

MSG="${COMMIT_MSG:-}"

if [[ "$MSG" =~ [Mm]erge\ pull\ request\ \#([0-9]+) ]]; then
    PR_NUM="${BASH_REMATCH[1]}"
    TITLE=$(gh pr view "$PR_NUM" --json title -q .title 2>/dev/null || true)
    TEXT="${TITLE:-$MSG}"
else
    TEXT="$MSG"
fi

{
    echo "text<<GITHUB_ACTIONS_DELIMITER"
    echo "$TEXT"
    echo "GITHUB_ACTIONS_DELIMITER"
} >> "$GITHUB_OUTPUT"
```

- [ ] **Step 2: Create `scripts/release/version/parse.sh`**

Write `scripts/release/version/parse.sh`:

```sh
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
```

- [ ] **Step 3: Create `scripts/release/version/update.sh`**

Write `scripts/release/version/update.sh`:

```sh
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
```

- [ ] **Step 4: Create `scripts/release/version/commit.sh`**

Write `scripts/release/version/commit.sh`:

```sh
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
```

- [ ] **Step 5: Make all four scripts executable**

Run: `chmod +x scripts/release/version/*.sh`

- [ ] **Step 6: Verify `parse.sh` extracts a version locally**

Run:
```sh
mkdir -p /tmp/cea-test && GITHUB_OUTPUT=/tmp/cea-test/out COMMIT_MSG="Release v1.4.0 - test" ./scripts/release/version/parse.sh && cat /tmp/cea-test/out
```
Expected: stdout `Version: 1.4.0` and file contains `version=1.4.0`.

- [ ] **Step 7: Verify `parse.sh` emits empty for non-version messages**

Run:
```sh
GITHUB_OUTPUT=/tmp/cea-test/out COMMIT_MSG="fix typo in readme" ./scripts/release/version/parse.sh && cat /tmp/cea-test/out
```
Expected: stdout `No version found - skipping release` and file contains `version=`.

- [ ] **Step 8: Commit**

```sh
git add scripts/release/version/
git commit -m "$(cat <<'EOF'
feat(release): version source/parse/update/commit scripts

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Release scripts — build, archive, verify, check

**Files:**
- Create: `scripts/release/build/npm.sh`
- Create: `scripts/release/create-archives.sh`
- Create: `scripts/release/verify.sh`
- Create: `scripts/release/check-package-info.sh`

- [ ] **Step 1: Create `scripts/release/build/npm.sh`**

Write `scripts/release/build/npm.sh`:

```sh
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
```

- [ ] **Step 2: Create `scripts/release/create-archives.sh`**

Write `scripts/release/create-archives.sh`:

```sh
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
```

- [ ] **Step 3: Create `scripts/release/verify.sh`**

Write `scripts/release/verify.sh`:

```sh
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
```

- [ ] **Step 4: Create `scripts/release/check-package-info.sh`**

Write `scripts/release/check-package-info.sh`:

```sh
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
```

- [ ] **Step 5: Make all four scripts executable**

Run:
```sh
chmod +x scripts/release/build/npm.sh scripts/release/create-archives.sh scripts/release/verify.sh scripts/release/check-package-info.sh
```

- [ ] **Step 6: Verify `build/npm.sh` builds 4 binaries locally**

Run: `./scripts/release/build/npm.sh`
Expected: prints `✓ Built 4 binaries...`. Files exist:
- `dist/bin/create-ekko-app-darwin-amd64`
- `dist/bin/create-ekko-app-darwin-arm64`
- `dist/bin/create-ekko-app-linux-amd64`
- `dist/bin/create-ekko-app-linux-arm64`
- `dist/cli.mjs`, `dist/package.json`, `dist/README.md`

- [ ] **Step 7: Verify version flag is embedded in the native binary**

Identify your native arch first:
```sh
go env GOOS GOARCH
```

Then run the matching binary with `--version` and confirm output shows `1.3.6` (the current pinned version), not `dev`. Example on darwin-arm64:
```sh
./dist/bin/create-ekko-app-darwin-arm64 --version
```
Expected: output contains `create-ekko-app 1.3.6`.

- [ ] **Step 8: Verify `create-archives.sh` produces 4 tarballs**

Run: `VERSION=1.3.6 ./scripts/release/create-archives.sh`
Expected: prints `✓ Created 4 archives in dist/`. Files exist:
- `dist/create-ekko-app_1.3.6_darwin_amd64.tar.gz`
- `dist/create-ekko-app_1.3.6_darwin_arm64.tar.gz`
- `dist/create-ekko-app_1.3.6_linux_amd64.tar.gz`
- `dist/create-ekko-app_1.3.6_linux_arm64.tar.gz`

- [ ] **Step 9: Verify `verify.sh` reports all files present**

Run: `./scripts/release/verify.sh`
Expected: ends with `All files verified successfully!`.

- [ ] **Step 10: Clean up `dist/` (local artifact, not tracked)**

Run: `rm -rf dist/`
(Do NOT commit `dist/` — it's a build output. Confirm it's in `.gitignore`. If not, add it before the commit below.)

- [ ] **Step 11: Ensure `dist/` is gitignored**

Read `.gitignore`. If `dist/` is not present, add a line `dist/` at the end. If `.gitignore` does not exist, create it with content:
```
dist/
```

- [ ] **Step 12: Commit**

```sh
git add scripts/release/build/ scripts/release/create-archives.sh scripts/release/verify.sh scripts/release/check-package-info.sh .gitignore
git commit -m "$(cat <<'EOF'
feat(release): npm build, archive, and verify scripts

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Replace `publish.yml` with `release.yml`

**Files:**
- Delete: `.github/workflows/publish.yml`
- Create: `.github/workflows/release.yml`

- [ ] **Step 1: Create `.github/workflows/release.yml`**

Write `.github/workflows/release.yml`:

```yaml
name: Release

on:
    push:
        branches: [main]

jobs:
    version:
        runs-on: ubuntu-latest
        if: "!contains(github.event.head_commit.message, '[skip ci]')"
        outputs:
            version: ${{ steps.version.outputs.version }}
            text: ${{ steps.source.outputs.text }}
        steps:
            - name: Checkout repository
              uses: actions/checkout@v5
              with:
                  token: ${{ secrets.RELEASE_TOKEN }}

            - name: Get version source (PR title or commit message)
              id: source
              env:
                  COMMIT_MSG: ${{ github.event.head_commit.message }}
                  GH_TOKEN: ${{ secrets.RELEASE_TOKEN }}
              run: ./scripts/release/version/get-source.sh

            - name: Parse version
              id: version
              env:
                  COMMIT_MSG: ${{ steps.source.outputs.text }}
              run: ./scripts/release/version/parse.sh

    build:
        needs: version
        if: needs.version.outputs.version != ''
        runs-on: ubuntu-latest
        permissions:
            contents: write
        steps:
            - name: Checkout repository
              uses: actions/checkout@v5
              with:
                  token: ${{ secrets.RELEASE_TOKEN }}

            - name: Update package.json version
              env:
                  VERSION: ${{ needs.version.outputs.version }}
              run: ./scripts/release/version/update.sh

            - name: Commit and push version bump
              env:
                  VERSION: ${{ needs.version.outputs.version }}
              run: ./scripts/release/version/commit.sh

            - name: Setup Go
              uses: actions/setup-go@v6
              with:
                  go-version-file: go.mod

            - name: Build binaries for all platforms
              run: ./scripts/release/build/npm.sh

            - name: Upload npm dist artifact
              uses: actions/upload-artifact@v5
              with:
                  name: npm-dist
                  path: dist/
                  retention-days: 1

    release:
        needs: [version, build]
        if: needs.version.outputs.version != ''
        runs-on: ubuntu-latest
        permissions:
            contents: write
        steps:
            - name: Checkout repository
              uses: actions/checkout@v5
              with:
                  ref: main
                  token: ${{ secrets.RELEASE_TOKEN }}

            - name: Download npm dist artifact
              uses: actions/download-artifact@v5
              with:
                  name: npm-dist
                  path: dist

            - name: Create release archives
              env:
                  VERSION: ${{ needs.version.outputs.version }}
              run: ./scripts/release/create-archives.sh

            - name: Tag and push latest
              run: |
                  git config user.name "github-actions[bot]"
                  git config user.email "github-actions[bot]@users.noreply.github.com"
                  git tag -f latest
                  git push origin latest --force

            - name: Create GitHub Release
              uses: softprops/action-gh-release@v2
              with:
                  tag_name: v${{ needs.version.outputs.version }}
                  name: Release v${{ needs.version.outputs.version }}
                  body: ${{ needs.version.outputs.text }}
                  files: |
                      dist/create-ekko-app_${{ needs.version.outputs.version }}_darwin_amd64.tar.gz
                      dist/create-ekko-app_${{ needs.version.outputs.version }}_darwin_arm64.tar.gz
                      dist/create-ekko-app_${{ needs.version.outputs.version }}_linux_amd64.tar.gz
                      dist/create-ekko-app_${{ needs.version.outputs.version }}_linux_arm64.tar.gz

    publish:
        needs: [version, release]
        if: needs.version.outputs.version != ''
        runs-on: ubuntu-latest
        permissions:
            id-token: write # needed for OIDC / trusted publishing
            contents: read
        steps:
            - name: Checkout repository
              uses: actions/checkout@v5
              with:
                  ref: main
                  token: ${{ secrets.GITHUB_TOKEN }}

            - name: Download npm dist artifact
              uses: actions/download-artifact@v5
              with:
                  name: npm-dist
                  path: dist

            - name: Restore binary permissions
              run: chmod +x dist/bin/create-ekko-app-*

            - name: Setup Node.js
              uses: actions/setup-node@v5
              with:
                  node-version: 22
                  registry-url: "https://registry.npmjs.org"

            # Ensure npm 11.5.1 or later for trusted publishing
            # https://docs.npmjs.com/trusted-publishers
            - name: Update npm to latest
              run: npm install -g npm@latest

            - name: Show Node & npm versions
              run: |
                  node -v
                  npm -v

            - name: Check package info and authentication
              env:
                  VERSION: ${{ needs.version.outputs.version }}
              run: ./scripts/release/check-package-info.sh

            - name: Verify files before publish
              run: ./scripts/release/verify.sh

            # Trusted publishing via OIDC
            # Workflow filename must match the configured trusted publisher on npmjs.com (release.yml).
            - name: Publish to npm
              working-directory: dist
              run: npm publish --access public --verbose
```

- [ ] **Step 2: Delete `.github/workflows/publish.yml`**

Run: `git rm .github/workflows/publish.yml`

- [ ] **Step 3: Verify YAML parses**

Run: `python3 -c "import yaml, sys; yaml.safe_load(open('.github/workflows/release.yml')); print('ok')"`
Expected: prints `ok`. (If `python3` lacks `yaml`, try `pip install pyyaml` or skip — GitHub will reject malformed YAML on push anyway.)

- [ ] **Step 4: Commit**

```sh
git add .github/workflows/release.yml
git commit -m "$(cat <<'EOF'
ci: PR-title-driven release workflow

Replaces tag-triggered publish.yml. New flow: PR title with vX.Y.Z
triggers version bump, build, GitHub Release, and npm publish.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Clean up Makefile and remove unused `cmd/` dirs

**Files:**
- Modify: `Makefile`
- Delete: `cmd/release-bump/`
- Delete: `cmd/release-version/`

- [ ] **Step 1: Replace Makefile content**

Replace the entire content of `Makefile` with:

```makefile
.PHONY: build go

build:
	mkdir -p bin
	go build -o bin/create-ekko-app ./cmd/create-ekko-app

go: build
	go run ./cmd/create-ekko-app
```

- [ ] **Step 2: Delete `cmd/release-bump/`**

Run: `git rm -r cmd/release-bump/`

- [ ] **Step 3: Delete `cmd/release-version/`**

Run: `git rm -r cmd/release-version/`

- [ ] **Step 4: Verify Go build still works**

Run: `make build`
Expected: produces `bin/create-ekko-app` with no errors.

- [ ] **Step 5: Verify nothing else in the repo references the deleted commands**

Run (using the Grep tool, not bash grep): pattern `release-bump|release-version`, path `/Users/mikekenway/Development/create-ekko-app`.
Expected: zero matches. If there are matches, investigate and update before continuing.

- [ ] **Step 6: Commit**

```sh
git add Makefile
git commit -m "$(cat <<'EOF'
chore: drop publish.* Makefile targets and release-bump/release-version cmds

CI now owns version bumps; the Go helpers and Makefile publish targets
they backed are no longer reachable.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Final repo-wide verification

No file changes. Run these checks before considering the plan complete.

- [ ] **Step 1: Status is clean**

Run: `git status --short`
Expected: empty output (or only pre-existing unrelated modifications from before this plan started).

- [ ] **Step 2: Build still works end-to-end**

Run: `make build && ./bin/create-ekko-app --version`
Expected: prints `create-ekko-app dev` (local build has no ldflags) or `create-ekko-app 1.3.6` if you bake it in. Either is fine — local builds default to `dev`.

- [ ] **Step 3: Workflow files list is correct**

Run: `ls .github/workflows/`
Expected: `release.yml` only. `publish.yml` is gone.

- [ ] **Step 4: Smoke-test miso resolution (if miso installed)**

Run: `miso scripts`
Expected: lists at minimum `build/create-ekko-app`, `local/install`, `local/uninstall`, `release/build/npm`, `release/create-archives`, `release/verify`, `release/check-package-info`, `release/version/get-source`, `release/version/parse`, `release/version/update`, `release/version/commit`. Skip if miso not installed.

- [ ] **Step 5: Print user setup checklist**

Print to the user (do not commit this as a file):

```
Pre-release setup (one-shot, USER does these — not Claude):

1. Add RELEASE_TOKEN repo secret on GitHub:
   - Settings → Secrets and variables → Actions → New repository secret
   - Name: RELEASE_TOKEN
   - Value: PAT with contents:write scope (classic with `repo`, or fine-grained
     with contents:write + pull-requests:read on ekkolyth/create-ekko-app)

2. Update npm trusted publisher on npmjs.com:
   - Open https://www.npmjs.com/package/create-ekko-app/access
   - Trusted Publishers → edit existing GitHub Actions publisher
   - Change workflow filename from "publish.yml" to "release.yml"
   - Save

After both are done, the next merge to main with "vX.Y.Z" in the PR title will
trigger a full release: version bump commit, build, GH Release, npm publish.
```

---

## Self-Review

Run the spec → plan coverage check:

- **`miso.json`** — Task 1 Step 1. ✓
- **`scripts/local/install.sh`** — Task 1 Step 3. ✓
- **`scripts/local/uninstall.sh`** — Task 1 Step 4. ✓
- **`scripts/build/create-ekko-app.sh`** — Task 1 Step 2. ✓
- **`.github/package.json` files array** — Task 2 Step 1. ✓
- **`.github/cli.mjs` bin/ subpath** — Task 2 Step 2. ✓
- **`scripts/release/version/get-source.sh`** — Task 3 Step 1. ✓
- **`scripts/release/version/parse.sh`** — Task 3 Step 2. ✓
- **`scripts/release/version/update.sh`** — Task 3 Step 3. ✓
- **`scripts/release/version/commit.sh`** — Task 3 Step 4. ✓
- **`scripts/release/build/npm.sh`** — Task 4 Step 1. ✓
- **`scripts/release/create-archives.sh`** — Task 4 Step 2. ✓
- **`scripts/release/verify.sh`** — Task 4 Step 3. ✓
- **`scripts/release/check-package-info.sh`** — Task 4 Step 4. ✓
- **`.github/workflows/release.yml`** — Task 5 Step 1. ✓
- **Drop `publish.yml`** — Task 5 Step 2. ✓
- **Drop Makefile `publish.*`** — Task 6 Step 1. ✓
- **Drop `cmd/release-bump/`, `cmd/release-version/`** — Task 6 Steps 2-3. ✓
- **First-time setup checklist** — Task 7 Step 5. ✓
- **Validation plan (build, archives, verify)** — Task 4 Steps 6-9. ✓

All spec requirements covered. No placeholders. File paths consistent across tasks (`.github/package.json`, `dist/bin/`, `scripts/release/version/`, etc.).
