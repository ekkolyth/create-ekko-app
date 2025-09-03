# create-ekko-app

Opinionated wrapper around `create-next-app` that asks a few extra questions and installs your preferred stack in one go.

- ✅ Runs `create-next-app@latest` interactively
- ✅ Optional add-ons with one install: **shadcn**, **Clerk**, **Convex**, **Email (react-hook-form, react-email, resend)**
- ✅ Installs all selected deps in one `pnpm add`
- ✅ Opens the project in VS Code (`code .`) when finished

## Usage

```bash
pnpm dlx create-ekko-app@latest my-app
```

This will:
- Ask all the normal Next.js questions
- Then ask: shadcn? clerk? convex? email?
- Install the selected extras
- Open the new project in VS Code

If you prefer to type the name later, just run:

```bash
pnpm dlx create-ekko-app@latest
```
