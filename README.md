## create-ekko-app

CLI that scaffolds a working full-stack TypeScript app with your choice of framework, auth, database, and tooling. Each option produces real wiring — providers, middleware, schemas, env files, docker-compose — not just deps.

## Usage

```bash
bunx create-ekko-app@latest
bunx create-ekko-app@latest my-app
```

Print the CLI version:

```bash
create-ekko-app -version
```

## Supported Stack

- **Frameworks**: Next.js (App Router), TanStack Start
- **Auth**: Clerk, Better Auth (forces Drizzle)
- **Database**: Convex, Drizzle (Postgres local via docker-compose)
- **Tooling**: shadcn (all components), TanStack Query, TanStack Form, React Email, Resend, Biome, Zod

## Requirements

- [Bun](https://bun.sh) installed (the CLI uses Bun for everything)
- For Convex: ability to log into the Convex CLI during scaffolding
- For Drizzle: Docker + Docker Compose

## Development

```bash
make build      # build binary into bin/
make go         # build and run from source
go test ./...   # run tests
```

Release flow: see `docs/releasing.md`.
