package steps

import (
	"context"
	"fmt"
)

// BuildFrameworkNext returns the step that scaffolds a Next.js project via Bun.
// The `--no-eslint` flag keeps eslint out by default; Biome (if selected) is
// added by a separate step.
func BuildFrameworkNext(in Input) Step {
	return Step{
		Title: "Create Next.js project",
		Run: func(ctx context.Context, write func(string)) error {
			args := []string{
				"create-next-app@latest",
				in.Cfg.ProjectName,
				"--app",
				"--ts",
				"--tailwind",
				"--src-dir",
				"--import-alias", "@/*",
				"--use-bun",
				"--turbopack",
				"--no-eslint",
				"--yes",
			}
			if err := in.Runner.Exec(ctx, "", "bunx", args, write); err != nil {
				return fmt.Errorf("create-next-app: %w", err)
			}
			return nil
		},
	}
}
