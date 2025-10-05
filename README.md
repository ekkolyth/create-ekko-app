# create-ekko-app

Opinionated wrapper around `create-next-app` that installs your preferred stack in one go.

## Usage

### Using Deno (Recommended)

```bash
deno run -A jsr:@mikekenway/create-ekko-app my-app
```

Or with the deno install command:

```bash
deno install -A -n create-ekko-app jsr:@mikekenway/create-ekko-app
create-ekko-app my-app
```

### Legacy NPM Usage (if published to npm)

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
deno run -A jsr:@mikekenway/create-ekko-app
```

## Development

### Running locally

```bash
deno task dev
```

### Building

```bash
deno task build
```

This will create a compiled binary in `./build/create-ekko-app`
