## create-ekko-app

CLI for scaffolding an Ekko app with selectable framework, auth, database, and tooling.

## Usage

From npm:

```bash
pnpm dlx create-ekko-app@latest
```

You can optionally pass the project name:

```bash
pnpm dlx create-ekko-app@latest my-app
```

Print the CLI version:

```bash
create-ekko-app -version
```

## Development

Build the Go binary:

```bash
make build
```

Run the CLI from source:

```bash
make go
```

Release version bumping and npm publishing are handled via `make publish*` targets and GitHub Actions (see `docs/releasing.md`).
