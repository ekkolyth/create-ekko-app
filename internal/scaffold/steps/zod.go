package steps

import "context"

// BuildZod installs zod. No wiring needed.
func BuildZod(in Input) Step {
	return Step{
		Title: "Install Zod",
		Run: func(ctx context.Context, write func(string)) error {
			return in.Runner.Exec(ctx, in.ProjectPath, "bun", []string{"add", "zod"}, write)
		},
	}
}
