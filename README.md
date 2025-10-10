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

## Development

### Running locally

```bash
deno task dev
```

### Building

```bash
deno task build
```

### Reminder to myself for pushing new versions
```bash
deno task publish
```

This will create a compiled binary in `./build/create-ekko-app`
