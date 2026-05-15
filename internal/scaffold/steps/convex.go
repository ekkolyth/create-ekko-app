package steps

import (
	"context"
	"fmt"

	"github.com/mikekenway/create-ekko-app/internal/options"
	"github.com/mikekenway/create-ekko-app/internal/scaffold/templates"
)

// BuildConvex installs convex, writes a provider, then runs convex dev once to
// provision a deployment. Login will be prompted on the user's terminal if
// needed (fail-fast: any error bubbles up and aborts the run).
func BuildConvex(in Input) []Step {
	add := Step{
		Title: "Install Convex",
		Run: func(ctx context.Context, write func(string)) error {
			return in.Runner.Exec(ctx, in.ProjectPath, "bun", []string{"add", "convex"}, write)
		},
	}

	provider := Step{
		Title: "Wire Convex provider",
		Run: func(ctx context.Context, write func(string)) error {
			switch in.Cfg.Framework {
			case options.FrameworkNext:
				body, err := templates.Render("next/convex-provider.tsx.tmpl", nil)
				if err != nil {
					return err
				}
				return in.Runner.WriteFile(Join(in.ProjectPath, "src/providers/convex-provider.tsx"), body, 0o644)
			case options.FrameworkTanstackStart:
				body, err := templates.Render("tanstack/router-convex.tsx.tmpl", nil)
				if err != nil {
					return err
				}
				return in.Runner.WriteFile(Join(in.ProjectPath, "src/integrations/convex.tsx"), body, 0o644)
			}
			return nil
		},
	}

	init := Step{
		Title: "Provision Convex deployment",
		Run: func(ctx context.Context, write func(string)) error {
			err := in.Runner.Exec(ctx, in.ProjectPath, "bunx",
				[]string{"convex", "dev", "--once", "--configure=new"}, write)
			if err != nil {
				return fmt.Errorf("convex provision (login required): %w", err)
			}
			return nil
		},
	}

	return []Step{add, provider, init}
}
