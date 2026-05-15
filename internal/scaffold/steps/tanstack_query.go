package steps

import (
	"context"

	"github.com/mikekenway/create-ekko-app/internal/options"
	"github.com/mikekenway/create-ekko-app/internal/scaffold/templates"
)

// BuildTanstackQuery installs deps and (Next only) writes a QueryProvider.
// TanStack Start integrates React Query via its router context — leave that to user.
func BuildTanstackQuery(in Input) Step {
	return Step{
		Title: "Install TanStack Query",
		Run: func(ctx context.Context, write func(string)) error {
			err := in.Runner.Exec(ctx, in.ProjectPath, "bun",
				[]string{"add", "@tanstack/react-query", "@tanstack/react-query-devtools"}, write)
			if err != nil {
				return err
			}
			if in.Cfg.Framework != options.FrameworkNext {
				return nil
			}
			body, err := templates.Render("next/query-provider.tsx.tmpl", nil)
			if err != nil {
				return err
			}
			return in.Runner.WriteFile(Join(in.ProjectPath, "src/providers/query-provider.tsx"), body, 0o644)
		},
	}
}
