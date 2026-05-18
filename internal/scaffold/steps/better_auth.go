package steps

import (
	"context"
	"fmt"

	"github.com/mikekenway/create-ekko-app/internal/options"
	"github.com/mikekenway/create-ekko-app/internal/scaffold/templates"
)

// BuildBetterAuth assumes Drizzle is selected (config.Normalize handles that).
// Three steps: install, wire, run @better-auth/cli to extend the schema.
func BuildBetterAuth(in Input) []Step {
	addStep := Step{
		Title: "Install Better Auth",
		EnvKeys: []EnvKey{
			{Section: "Better Auth", Key: "BETTER_AUTH_SECRET", Value: "replace-me-with-a-32-char-secret"},
			{Section: "Better Auth", Key: "BETTER_AUTH_URL", Value: "http://localhost:3000"},
		},
		Run: func(ctx context.Context, write func(string)) error {
			return in.Runner.Exec(ctx, in.ProjectPath, "bun", []string{"add", "better-auth"}, write)
		},
	}

	wireStep := Step{
		Title: "Wire Better Auth",
		Run: func(ctx context.Context, write func(string)) error {
			files := map[string]string{
				"src/lib/auth.ts":        "common/auth-lib.ts.tmpl",
				"src/lib/auth-client.ts": "common/auth-client.ts.tmpl",
			}
			switch in.Cfg.Framework {
			case options.FrameworkNext:
				files["src/app/api/auth/[...all]/route.ts"] = "next/api-better-auth-route.ts.tmpl"
			case options.FrameworkTanstackStart:
				files["src/routes/api/auth.$.ts"] = "tanstack/server-better-auth.ts.tmpl"
			}
			for dest, tmpl := range files {
				body, err := templates.Render(tmpl, nil)
				if err != nil {
					return err
				}
				if err := in.Runner.WriteFile(Join(in.ProjectPath, dest), body, 0o644); err != nil {
					return fmt.Errorf("write %s: %w", dest, err)
				}
			}
			return nil
		},
	}

	genStep := Step{
		Title: "Generate Better Auth schema",
		Run: func(ctx context.Context, write func(string)) error {
			return in.Runner.Exec(ctx, in.ProjectPath, "bunx",
				[]string{"@better-auth/cli", "generate", "--output", "src/db/schema.ts", "-y"}, write)
		},
	}

	return []Step{addStep, wireStep, genStep}
}
