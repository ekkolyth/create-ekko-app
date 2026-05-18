# Adopt miso's Release Setup in create-ekko-app

**Date:** 2026-05-14
**Status:** Design

## Goal

Replace create-ekko-app's tag-triggered `publish.yml` with miso's PR-title-driven, 4-job release workflow. Mirror miso's `scripts/` layout including `scripts/local/install.sh` and `scripts/local/uninstall.sh` for local Go installs. Adopt miso's script conventions (`miso.json`, extension-based dispatch, no shebangs, no `set -e` boilerplate).

## Scope

- New `.github/workflows/release.yml` replacing `publish.yml`.
- New `scripts/release/` tree (version parse/update/commit, build, archive, verify).
- New `scripts/local/install.sh` and `scripts/local/uninstall.sh`.
- New `scripts/build/create-ekko-app.sh` for local cross-builds.
- New root `miso.json` (simple mode, `packageManager: false`).
- Update `.github/package.json` (add `files` array).
- Update `.github/cli.mjs` (binaries now under `bin/` subdir of dist).
- Drop unused: Makefile `publish.*` targets, `cmd/release-bump/`, `cmd/release-version/`.

## Non-Goals

- No monorepo migration (stay flat).
- No Windows builds (darwin/linux × amd64/arm64 only).
- No scope change to npm package name (`create-ekko-app` stays unscoped).
- No top-level curl-bash installer (`scripts/install.sh` / `uninstall.sh` at miso repo root). Distribution remains via npm.

## Architecture

### Final Repo Layout

```
create-ekko-app/
├── .github/
│   ├── workflows/
│   │   └── release.yml          # NEW (replaces publish.yml)
│   ├── package.json             # MODIFIED (files array)
│   └── cli.mjs                  # MODIFIED (bin/ subpath)
├── scripts/
│   ├── local/
│   │   ├── install.sh           # NEW
│   │   └── uninstall.sh         # NEW
│   ├── release/
│   │   ├── version/
│   │   │   ├── get-source.sh    # NEW
│   │   │   ├── parse.sh         # NEW
│   │   │   ├── update.sh        # NEW
│   │   │   └── commit.sh        # NEW
│   │   ├── build/
│   │   │   └── npm.sh           # NEW
│   │   ├── create-archives.sh   # NEW
│   │   ├── verify.sh            # NEW
│   │   └── check-package-info.sh # NEW
│   └── build/
│       └── create-ekko-app.sh   # NEW (local build)
├── miso.json                    # NEW
├── Makefile                     # MODIFIED (drop publish.*)
├── cmd/
│   └── create-ekko-app/         # unchanged
├── internal/                    # unchanged
└── bin/                         # unchanged (local builds output here)
```

Deleted:
- `.github/workflows/publish.yml`
- `cmd/release-bump/`
- `cmd/release-version/`

## Release Workflow (`.github/workflows/release.yml`)

**Trigger:** `push` to `main`.

**Skip condition:** top-level `if: "!contains(github.event.head_commit.message, '[skip ci]')"` on the `version` job. CI bump commits include `[skip ci]` so they don't re-trigger the workflow.

### Job 1 — `version`

Runs `scripts/release/version/get-source.sh`:

- If commit is a merge commit (matches `[Mm]erge pull request #N`), fetches PR title via `gh pr view N --json title -q .title`.
- Otherwise uses the commit message.
- Writes result to `GITHUB_OUTPUT` as `text` (multiline heredoc).

Then `scripts/release/version/parse.sh` regex-extracts `\d+\.\d+\.\d+` from `text`, writes `version=` to `GITHUB_OUTPUT`. Empty if no match.

Outputs: `version`, `text`.

### Job 2 — `build`

Guard: `if: needs.version.outputs.version != ''`.

Steps:

1. Checkout with `RELEASE_TOKEN` (so push back to `main` triggers nothing further but is authenticated).
2. `scripts/release/version/update.sh` — node script writes `pkg.version = $VERSION` into `.github/package.json`.
3. `scripts/release/version/commit.sh` — config bot user, `git add .github/package.json`, commit `chore: bump version to $VERSION [skip ci]`, push.
4. Setup Go via `go-version-file: go.mod`.
5. `scripts/release/build/npm.sh`:

   ```sh
   mkdir -p dist/bin

   VERSION=$(node -p "require('./.github/package.json').version")
   LDFLAGS="-X main.version=$VERSION"

   CGO_ENABLED=0 GOOS=darwin  GOARCH=amd64 go build -ldflags "$LDFLAGS" -o dist/bin/create-ekko-app-darwin-amd64 ./cmd/create-ekko-app
   CGO_ENABLED=0 GOOS=darwin  GOARCH=arm64 go build -ldflags "$LDFLAGS" -o dist/bin/create-ekko-app-darwin-arm64 ./cmd/create-ekko-app
   CGO_ENABLED=0 GOOS=linux   GOARCH=amd64 go build -ldflags "$LDFLAGS" -o dist/bin/create-ekko-app-linux-amd64  ./cmd/create-ekko-app
   CGO_ENABLED=0 GOOS=linux   GOARCH=arm64 go build -ldflags "$LDFLAGS" -o dist/bin/create-ekko-app-linux-arm64  ./cmd/create-ekko-app

   chmod +x dist/bin/create-ekko-app-*

   cp .github/cli.mjs .github/package.json README.md dist/
   ```

6. Upload `dist/` as artifact `npm-dist` (retention 1 day).

### Job 3 — `release`

Guard: same version check. Needs `version` and `build`.

Steps:

1. Checkout `main` (now contains bump commit) with `RELEASE_TOKEN`.
2. Download `npm-dist` artifact to `dist/`.
3. `scripts/release/create-archives.sh`:

   ```sh
   VERSION="${VERSION:?VERSION is required}"
   cd dist
   tar -czf create-ekko-app_${VERSION}_darwin_amd64.tar.gz -C bin create-ekko-app-darwin-amd64
   tar -czf create-ekko-app_${VERSION}_darwin_arm64.tar.gz -C bin create-ekko-app-darwin-arm64
   tar -czf create-ekko-app_${VERSION}_linux_amd64.tar.gz  -C bin create-ekko-app-linux-amd64
   tar -czf create-ekko-app_${VERSION}_linux_arm64.tar.gz  -C bin create-ekko-app-linux-arm64
   ```

4. Force-push `latest` tag to current HEAD.
5. `softprops/action-gh-release@v2`:
   - `tag_name: v${version}`
   - `name: Release v${version}`
   - `body: ${{ needs.version.outputs.text }}` (PR title as release body)
   - Files: the 4 `.tar.gz` archives.

### Job 4 — `publish`

Guard: same. Needs `version` and `release`.

Permissions: `id-token: write` (OIDC), `contents: read`.

Steps:

1. Checkout `main`.
2. Download `npm-dist` artifact.
3. `chmod +x dist/bin/create-ekko-app-*` (artifact loses unix perms).
4. Setup Node 22 with `registry-url: https://registry.npmjs.org`.
5. `npm install -g npm@latest` (need ≥11.5.1 for trusted publishing).
6. `scripts/release/check-package-info.sh` (logs npm registry status, checks if version already published).
7. `scripts/release/verify.sh` (checks `dist/README.md`, `dist/cli.mjs`, `dist/package.json`, resolves `bin.create-ekko-app` and verifies file exists).
8. `cd dist && npm publish --access public --verbose`.

### Secrets & npm Setup

- **`RELEASE_TOKEN`** repo secret — PAT with `contents:write` so the bot bump push triggers Job 3 / Job 4 (default `GITHUB_TOKEN` won't trigger downstream workflows on push).
- **npm trusted publisher** must be reconfigured on npmjs.com to point at workflow filename `release.yml` (was `publish.yml`). This is required before first release under new workflow name.

## Scripts (Detailed)

### `scripts/release/version/get-source.sh`

```sh
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

Note: `.sh` extension. Miso would invoke as `sh`, but CI executes the file directly. We add `#!/usr/bin/env bash` shebang here because bash regex `[[ ... =~ ... ]]` requires bash. Same exception for `parse.sh`, `update.sh`, `commit.sh`, `verify.sh`, `check-package-info.sh`. Miso-scripting skill says "never add a shebang" — that applies inside miso-managed invocation. CI workflow invokes scripts directly via `./path/to/script.sh`, so shebangs are required there.

Decision: keep shebangs on these CI-invoked scripts to make them runnable both ways. `scripts/local/install.sh` and `scripts/local/uninstall.sh` follow miso conventions (no shebang, no `set -e`) since they're miso-invoked locally.

### `scripts/release/version/parse.sh`

```sh
#!/usr/bin/env bash
MSG="${COMMIT_MSG:-}"

if [[ "$MSG" =~ ([0-9]+\.[0-9]+\.[0-9]+) ]]; then
    echo "version=${BASH_REMATCH[1]}" >> "$GITHUB_OUTPUT"
    echo "Version: ${BASH_REMATCH[1]}"
else
    echo "version=" >> "$GITHUB_OUTPUT"
    echo "No version found - skipping release"
fi
```

### `scripts/release/version/update.sh`

```sh
#!/usr/bin/env bash
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

### `scripts/release/version/commit.sh`

```sh
#!/usr/bin/env bash
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

### `scripts/release/build/npm.sh`

See Job 2 step 5 above.

### `scripts/release/create-archives.sh`

See Job 3 step 3 above.

### `scripts/release/verify.sh`

```sh
#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT/dist"

echo "Verifying required files exist in dist/..."
ls -la
echo ""

[ -f "README.md" ]    || { echo "ERROR: README.md missing";    exit 1; }
[ -f "cli.mjs" ]      || { echo "ERROR: cli.mjs missing";      exit 1; }
[ -f "package.json" ] || { echo "ERROR: package.json missing"; exit 1; }

BIN_PATH=$(node -p "require('./package.json').bin['create-ekko-app']")
[ -f "$BIN_PATH" ] || { echo "ERROR: bin file $BIN_PATH missing"; exit 1; }

echo "✓ All files verified"
```

### `scripts/release/check-package-info.sh`

```sh
#!/usr/bin/env bash
set -e
VERSION="${VERSION:?VERSION is required}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT/dist"

PACKAGE_NAME=$(node -p "require('./package.json').name")

echo "Package: $PACKAGE_NAME@$VERSION"
echo "Registry: $(npm config get registry)"

if npm view "$PACKAGE_NAME" version 2>/dev/null; then
  npm view "$PACKAGE_NAME@$VERSION" version 2>/dev/null \
    && echo "Version $VERSION already published" \
    || echo "Version $VERSION not found - will publish"
else
  echo "Package does not exist on npm - first time publish"
fi
```

### `scripts/local/install.sh`

```sh
BINARY=${BINARY:-create-ekko-app}
GOBIN=$(go env GOBIN)
[ -z "$GOBIN" ] && GOBIN=$(go env GOPATH)/bin

sh ./scripts/build/create-ekko-app.sh

echo "Installing $BINARY to $GOBIN"
cp bin/$BINARY $GOBIN/$BINARY || exit 1
echo "✓ Installed $BINARY to $GOBIN"
```

No shebang, no `set -e` — miso adds `-e` automatically.

### `scripts/local/uninstall.sh`

```sh
BINARY=${BINARY:-create-ekko-app}
GOBIN=$(go env GOBIN)
[ -z "$GOBIN" ] && GOBIN=$(go env GOPATH)/bin

rm -f $GOBIN/$BINARY
```

### `scripts/build/create-ekko-app.sh`

```sh
mkdir -p bin
go build -o bin/create-ekko-app ./cmd/create-ekko-app
echo "✓ Built bin/create-ekko-app"
```

## `miso.json`

```json
{
  "$schema": "https://misojs.dev/miso.schema.json",
  "packageManager": false,
  "scripts": "./scripts"
}
```

Simple mode. No package manager wrapping. Scripts resolve from `./scripts`.

Invocations:
- `miso local/install` → `scripts/local/install.sh`
- `miso local/uninstall` → `scripts/local/uninstall.sh`
- `miso build/create-ekko-app` → `scripts/build/create-ekko-app.sh`

CI does not invoke via miso; CI runs scripts directly (`./scripts/release/...`).

## `.github/package.json` (Final)

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

Version starts at `1.3.6` (current). Bumped by CI on next release.

## `.github/cli.mjs` Diff

Only change: binary resolution path now includes `bin/` subdir.

```diff
-  return join(__dirname, binaryName);
+  return join(__dirname, "bin", binaryName);
```

## Makefile (Final)

```makefile
.PHONY: build go

build:
	mkdir -p bin
	go build -o bin/create-ekko-app ./cmd/create-ekko-app

go: build
	go run ./cmd/create-ekko-app
```

Drop: `publish`, `publish.patch`, `publish.minor`, `publish.major`, `publish.current`, `_publish` targets. Drop dependency on `cmd/release-bump/` and `cmd/release-version/` (those dirs deleted).

## Release Procedure

1. Branch, commit work, open PR.
2. PR title: `Release v1.4.0 - short description`.
3. Merge to `main`.
4. CI auto-bumps `.github/package.json`, builds, creates GH Release, publishes to npm.

To skip release on a merge: omit `vX.Y.Z` from PR title. Version job outputs empty; downstream jobs skip.

Hotfix without PR: push commit to `main` directly with `vX.Y.Z` in message.

## First-Time Setup (One-Shot)

1. Add `RELEASE_TOKEN` repo secret (PAT, `contents:write`).
2. npmjs.com → `create-ekko-app` → Settings → Trusted Publishers. **Update workflow filename from `publish.yml` to `release.yml`.** Must happen before first release under new flow.

## Validation Plan

### Pre-merge checks

- Workflow syntax parses cleanly.
- `[skip ci]` commit → version job skipped.
- Commit without `vX.Y.Z` → version job outputs empty, downstream jobs skip.

### First real release (`v1.3.7`)

- Trusted publisher reconfigured for `release.yml`.
- `RELEASE_TOKEN` exists.
- PR `Release v1.3.7 - test miso flow` merged.
- All 4 jobs green.
- `main` contains bump commit with `[skip ci]`.
- GH Release `v1.3.7` exists with 4 `.tar.gz` archives. `latest` tag points to same commit.
- `npm view create-ekko-app version` returns `1.3.7`.
- `npx create-ekko-app@1.3.7 --version` works on darwin-arm64.

### Local install smoke test

```sh
miso local/install
which create-ekko-app           # $GOBIN/create-ekko-app
create-ekko-app --version
miso local/uninstall
which create-ekko-app           # not found
```

### Rollback

If a release ships broken: delete `v1.3.7` tag + GH Release, `npm unpublish create-ekko-app@1.3.7` (within 72h), revert bump commit on `main`. Re-release as `v1.3.8`.

## Open Questions

None. All clarifying questions resolved during brainstorming.
