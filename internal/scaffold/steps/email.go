package steps

import (
	"context"

	"github.com/mikekenway/create-ekko-app/internal/options"
	"github.com/mikekenway/create-ekko-app/internal/scaffold/templates"
)

// BuildEmail wires Resend and/or React Email based on which are selected.
// Either alone is valid; both is the typical pairing.
func BuildEmail(in Input) []Step {
	hasResend := in.Cfg.HasTool(options.ToolResend)
	hasEmail := in.Cfg.HasTool(options.ToolReactEmail)

	var out []Step
	if hasResend {
		out = append(out, Step{
			Title: "Install Resend",
			EnvKeys: []EnvKey{
				{Section: "Resend", Key: "RESEND_API_KEY", Value: "re_..."},
			},
			Run: func(ctx context.Context, write func(string)) error {
				if err := in.Runner.Exec(ctx, in.ProjectPath, "bun", []string{"add", "resend"}, write); err != nil {
					return err
				}
				body, err := templates.Render("common/resend-lib.ts.tmpl", nil)
				if err != nil {
					return err
				}
				return in.Runner.WriteFile(Join(in.ProjectPath, "src/lib/resend.ts"), body, 0o644)
			},
		})
	}
	if hasEmail {
		out = append(out, Step{
			Title: "Install React Email",
			Run: func(ctx context.Context, write func(string)) error {
				if err := in.Runner.Exec(ctx, in.ProjectPath, "bun",
					[]string{"add", "@react-email/components", "@react-email/render"}, write); err != nil {
					return err
				}
				if err := in.Runner.Exec(ctx, in.ProjectPath, "bun",
					[]string{"add", "-d", "react-email"}, write); err != nil {
					return err
				}
				body, err := templates.Render("common/welcome-email.tsx.tmpl", nil)
				if err != nil {
					return err
				}
				return in.Runner.WriteFile(Join(in.ProjectPath, "src/emails/welcome.tsx"), body, 0o644)
			},
		})
	}
	return out
}
