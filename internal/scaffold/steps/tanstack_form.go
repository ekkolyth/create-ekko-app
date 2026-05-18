package steps

import (
	"context"

	"github.com/mikekenway/create-ekko-app/internal/options"
	"github.com/mikekenway/create-ekko-app/internal/scaffold/templates"
)

// BuildTanstackForm installs the dep and writes a sample form (Zod-validated
// when Zod is also selected).
func BuildTanstackForm(in Input) Step {
	return Step{
		Title: "Install TanStack Form",
		Run: func(ctx context.Context, write func(string)) error {
			if err := in.Runner.Exec(ctx, in.ProjectPath, "bun",
				[]string{"add", "@tanstack/react-form"}, write); err != nil {
				return err
			}
			data := map[string]any{"UseZod": in.Cfg.HasTool(options.ToolZod)}
			body, err := templates.Render("common/example-form.tsx.tmpl", data)
			if err != nil {
				return err
			}
			return in.Runner.WriteFile(Join(in.ProjectPath, "src/components/example-form.tsx"), body, 0o644)
		},
	}
}
