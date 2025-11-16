## Releasing and publishing

This project uses a simple, tag-driven release flow:

- **Source of truth**: `.github/package.json` (fields: `name`, `version`)
- **Version bumps**: via `make publish` and related targets
- **Publishing**: GitHub Actions publishes to npm on `v*` tags

### Version bumping and tags

- **Semver**: versions follow the format `X.Y.Z` (major.minor.patch).
- **Default bump**: `make publish` bumps the **patch** version.
- **Explicit bump levels**:
  - `make publish` (or `make publish.patch`) – patch bump.
  - `make publish.minor` – minor bump.
  - `make publish.major` – major bump.
- **Publish without bumping**: `make publish.current` – publishes the current version from `.github/package.json` without bumping it.

On a non–dry run, `make publish` will:

1. Ensure the working tree is clean.
2. Bump the version in `.github/package.json` using the chosen level.
3. Commit the updated `.github/package.json` with message `chore: release vX.Y.Z`.
4. Create an annotated tag `vX.Y.Z`.
5. Push the current branch and the new tag to `origin`.

The `make publish.current` command works similarly but skips steps 2-3 (no version bump or commit), and directly creates a tag for the current version in `.github/package.json`.

### Dry runs

You can preview the next version and tag without changing anything:

```bash
make publish.minor DRY_RUN=1
```

This will:

- Read the current version from `.github/package.json`.
- Print the next version and the tag it would create.
- **Not** modify files, commit, tag, or push.

### How npm publish works

Publishing is handled in CI using **trusted publishing with OIDC** (no tokens required):

- The GitHub Actions workflow triggers on pushes of tags matching `v*`.
- The `publish-npm` job:
  - Checks out the repo.
  - Sets up Node.js with npm 11.5.1+ (required for trusted publishing).
  - Copies `.github/package.json` to `dist/package.json`.
  - Runs `npm publish` from the `dist` directory using trusted publishing (OIDC).
  - Automatically generates provenance attestations.

#### Setting up trusted publishing (one-time setup)

Before publishing, you must configure the trusted publisher on npmjs.com:

1. Go to your package settings: `https://www.npmjs.com/settings/[your-username]/packages`
2. Select your package (or create it first if it doesn't exist)
3. Go to **Settings** → **Trusted Publishers**
4. Click **Add Trusted Publisher**
5. Select **GitHub Actions** as the provider
6. Configure:
   - **Repository**: `ekkolyth/create-ekko-app` (or your org/repo)
   - **Workflow file name**: `publish.yml` (must match exactly, case-sensitive, include `.yml` extension)
7. Save the configuration

**Important**: The workflow filename (`publish.yml`) must match exactly what you configure on npmjs.com, including the `.yml` extension and case sensitivity.

**Note**: Provenance is automatically generated when using trusted publishing from a public repository. No additional flags needed.

In practice:

- **Local**: you run `make publish` (or `make publish.minor` / `.major`), optionally with `DRY_RUN=1`.
- **Remote**: CI sees the new `vX.Y.Z` tag and publishes that version to npm using trusted publishing.

For more details, see: https://docs.npmjs.com/trusted-publishers


