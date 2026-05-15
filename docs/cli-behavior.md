# CLI Behavior (v2)

## Prompts

1. **Project name** — text input, defaults to `ekko-app`, skipped if passed as positional arg.
2. **Framework** — `Next.js` (default) or `TanStack Start`.
3. **Auth** — `None`, `Clerk`, `Better Auth`.
4. **Better Auth note** — shown only when Better Auth is selected; explains Drizzle will be enabled.
5. **Database** — `None`, `Convex`, `Drizzle (Postgres local)`. Coerced to Drizzle when Better Auth is chosen.
6. **Tooling (multi-select)** — Biome, Zod, shadcn, TanStack Query, TanStack Form, React Email, Resend.
7. **shadcn base color** — shown only if shadcn selected. Options: neutral, gray, zinc (default), stone, slate.

## Summary Screen

Animated reveal of selections. `enter` to start, `q` / `esc` / `ctrl+c` to abort.

## Install Pipeline

Steps in order:

1. Framework scaffold (`bunx create-next-app` or `bun create @tanstack/start`).
2. Biome install + `biome.json` written, if selected.
3. Zod install, if selected.
4. Database:
   - Convex: install, write provider, run `bunx convex dev --once --configure=new` (may prompt login).
   - Drizzle: install, write `drizzle.config.ts`, `src/db/{index,schema}.ts`, `docker-compose.yml`.
5. Auth:
   - Clerk: install + middleware + sign-in/up routes (Next) or router integration (TanStack Start).
   - Better Auth: install + `lib/auth.ts` + `lib/auth-client.ts` + framework route + `bunx @better-auth/cli generate` to write schema.
6. Email: Resend install + `src/lib/resend.ts`; React Email install + `src/emails/welcome.tsx`.
7. TanStack Query: install + provider (Next only).
8. TanStack Form: install + sample form (Zod-validated if Zod selected).
9. shadcn: `bunx shadcn@latest init --base-color <color>` + `add --all`.
10. `.env.local` aggregator — last step, merges keys from every selected option.

## Completion

Prints:

- `cd <project>`
- If Drizzle: `docker compose up -d` and `bun run db:migrate`
- `bun dev`

## Errors

- Convex provisioning failure aborts the run (fail fast — login is required).
- Other step failures abort the run with the failing step's title and error reported.
