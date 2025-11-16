## Releasing and publishing

This project uses a simple, tag-driven release flow:

- **Source of truth**: `release.json` (fields: `name`, `version`)
- **Version bumps**: via `make publish` and related targets
- **Publishing**: GitHub Actions publishes to npm on `v*` tags

### Version bumping and tags

- **Semver**: versions follow the format `X.Y.Z` (major.minor.patch).
- **Default bump**: `make publish` bumps the **patch** version.
- **Explicit bump levels**:
  - `make publish` (or `make publish.patch`) – patch bump.
  - `make publish.minor` – minor bump.
  - `make publish.major` – major bump.

On a non–dry run, `make publish` will:

1. Ensure the working tree is clean.
2. Bump the version in `release.json` using the chosen level.
3. Commit the updated `release.json` with message `chore: release vX.Y.Z`.
4. Create an annotated tag `vX.Y.Z`.
5. Push the current branch and the new tag to `origin`.

### Dry runs

You can preview the next version and tag without changing anything:

```bash
make publish.minor DRY_RUN=1
```

This will:

- Read the current version from `release.json`.
- Print the next version and the tag it would create.
- **Not** modify files, commit, tag, or push.

### How npm publish works

Publishing is handled in CI:

- The GitHub Actions workflow triggers on pushes of tags matching `v*`.
- The `publish-npm` job:
  - Checks out the repo.
  - Reads `release.json` and generates a `package.json` with the same `name` and `version`.
  - Runs `npm publish` using the `NPM_TOKEN` secret.

In practice:

- **Local**: you run `make publish` (or `make publish.minor` / `.major`), optionally with `DRY_RUN=1`.
- **Remote**: CI sees the new `vX.Y.Z` tag and publishes that version to npm.


