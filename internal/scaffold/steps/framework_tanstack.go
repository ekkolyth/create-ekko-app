package steps

import (
	"context"
	"fmt"
)

// BuildFrameworkTanstack runs the TanStack Start create command via Bun.
// Invocation: `bun create @tanstack/start@latest <name>`.
func BuildFrameworkTanstack(in Input) Step {
	return Step{
		Title: "Create TanStack Start project",
		Run: func(ctx context.Context, write func(string)) error {
			args := []string{"create", "@tanstack/start@latest", in.Cfg.ProjectName}
			if err := in.Runner.Exec(ctx, "", "bun", args, write); err != nil {
				return fmt.Errorf("tanstack start create: %w", err)
			}
			return nil
		},
	}
}
