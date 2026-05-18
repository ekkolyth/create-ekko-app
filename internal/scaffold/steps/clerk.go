package steps

import (
	"context"
	"fmt"

	"github.com/mikekenway/create-ekko-app/internal/options"
	"github.com/mikekenway/create-ekko-app/internal/scaffold/templates"
)

// BuildClerk installs Clerk and writes framework-appropriate wiring.
// Next: middleware + sign-in/up routes. TanStack Start: router integration.
func BuildClerk(in Input) Step {
	publishableKey := "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
	if in.Cfg.Framework == options.FrameworkTanstackStart {
		publishableKey = "VITE_CLERK_PUBLISHABLE_KEY"
	}
	return Step{
		Title: "Install and wire Clerk",
		EnvKeys: []EnvKey{
			{Section: "Clerk", Key: publishableKey, Value: "pk_test_..."},
			{Section: "Clerk", Key: "CLERK_SECRET_KEY", Value: "sk_test_..."},
		},
		Run: func(ctx context.Context, write func(string)) error {
			switch in.Cfg.Framework {
			case options.FrameworkNext:
				if err := in.Runner.Exec(ctx, in.ProjectPath, "bun", []string{"add", "@clerk/nextjs"}, write); err != nil {
					return fmt.Errorf("bun add clerk: %w", err)
				}
				files := map[string]string{
					"src/middleware.ts":                       "next/middleware-clerk.ts.tmpl",
					"src/app/sign-in/[[...sign-in]]/page.tsx": "next/sign-in-page.tsx.tmpl",
					"src/app/sign-up/[[...sign-up]]/page.tsx": "next/sign-up-page.tsx.tmpl",
				}
				for dest, tmpl := range files {
					body, err := templates.Render(tmpl, nil)
					if err != nil {
						return err
					}
					if err := in.Runner.WriteFile(Join(in.ProjectPath, dest), body, 0o644); err != nil {
						return err
					}
				}
				return nil
			case options.FrameworkTanstackStart:
				if err := in.Runner.Exec(ctx, in.ProjectPath, "bun", []string{"add", "@clerk/tanstack-react-start"}, write); err != nil {
					return fmt.Errorf("bun add clerk: %w", err)
				}
				body, err := templates.Render("tanstack/router-clerk.tsx.tmpl", nil)
				if err != nil {
					return err
				}
				return in.Runner.WriteFile(Join(in.ProjectPath, "src/integrations/clerk.tsx"), body, 0o644)
			}
			return nil
		},
	}
}
