# Current TypeScript CLI Behavior

## Prompts and Defaults

- Project name prompt via `Input.prompt`, default `ekko-app`; exits gracefully when empty/cancelled.
- Framework select uses `Select.prompt` with `Next JS` (`next`, default) and `TanStack Start` (`tanstack-start`).
- Auth select offers `Clerk`, `Better Auth`, `None` (default `none`).
- Database select offers `Convex`, `Drizzle`, `None` (default `none`).
- Tooling checkbox list (`Tanstack Query`, `Tanstack Form`, `shadcn`, `React Email`, `Resend`) with no default selections and `confirmSubmit: false`.
- If `shadcn` selected, prompt for base color with options `neutral`, `gray`, `zinc` (default), `stone`, `slate`.

## Summary Output

- Prints heading `📋 Summary of selections:`.
- Emits `✓` lines for framework, chosen auth/db, shadcn + color, and any tooling options selected.

## Scaffold Workflow

1. Framework scaffold:
   - `next`: `pnpm dlx create-next-app@latest <name> --app --ts --tailwind --eslint --turbopack --src-dir --use-pnpm --import-alias @/*`.
   - `tanstack-start`: `pnpm create @tanstack/start@latest <name>`.
2. `chdir` into project directory.
3. Build dependency list based on selections:
   - shadcn: `class-variance-authority clsx tailwindcss-animate lucide-react tailwind-merge`.
   - auth: `@clerk/nextjs` or `@clerk/clerk-react`, `better-auth`.
   - db: `convex`, `drizzle-orm`.
   - email: `@react-email/components`, `@react-email/render`, `resend`.
   - tooling: `@tanstack/react-query`, `@tanstack/react-form`.
4. If deps exist: `pnpm add ...`.
5. Post-install shadcn:
   - Next: `pnpm dlx shadcn@latest init -y --base-color <color>` then `pnpm dlx shadcn@latest add --all -y`.
   - TanStack Start: log informational skip.
6. Attempt `code .` (silent), log fallback instructions if unavailable.
7. Completion text: done message plus `cd <name>` and `pnpm dev`.

## Error Handling

- `run` helper executes commands synchronously, throws on non-zero exit.
- All prompts handle cancellation (Input) by exiting with note.
- shadcn automation is wrapped in try/catch with fallback instructions.

## Non-interactive Invocation

- CLI entry via `Command` accepts optional `[name:string]` argument to skip project-name prompt; other prompts always interactive.

