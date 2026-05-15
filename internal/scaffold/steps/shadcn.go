package steps

import (
	"context"
	"fmt"
)

// BuildShadcn returns shadcn init + "add all components" steps.
// Color defaults to zinc when not set.
func BuildShadcn(in Input) []Step {
	color := in.Cfg.ShadcnColor
	if color == "" {
		color = "zinc"
	}
	return []Step{
		{
			Title: fmt.Sprintf("Initialize shadcn (%s)", color),
			Run: func(ctx context.Context, write func(string)) error {
				return in.Runner.Exec(ctx, in.ProjectPath, "bunx",
					[]string{"shadcn@latest", "init", "-y", "--base-color", color}, write)
			},
		},
		{
			Title: "Add all shadcn components",
			Run: func(ctx context.Context, write func(string)) error {
				return in.Runner.Exec(ctx, in.ProjectPath, "bunx",
					[]string{"shadcn@latest", "add", "--all", "-y"}, write)
			},
		},
	}
}
