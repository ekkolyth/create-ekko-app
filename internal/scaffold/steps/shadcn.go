package steps

import (
	"context"
	"encoding/json"
	"fmt"
)

// BuildShadcn returns shadcn init + "add all components" steps.
// Color defaults to zinc when not set. Base color is applied by patching
// components.json after init, since shadcn 3.x removed --base-color.
func BuildShadcn(in Input) []Step {
	color := in.Cfg.ShadcnColor
	if color == "" {
		color = "zinc"
	}
	return []Step{
		{
			Title: fmt.Sprintf("Initialize shadcn (%s)", color),
			Run: func(ctx context.Context, write func(string)) error {
				if err := in.Runner.Exec(ctx, in.ProjectPath, "bunx",
					[]string{"shadcn@latest", "init", "-y", "-d"}, write); err != nil {
					return err
				}
				return patchShadcnBaseColor(in, color)
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

func patchShadcnBaseColor(in Input, color string) error {
	path := Join(in.ProjectPath, "components.json")
	data, err := in.Runner.ReadFile(path)
	if err != nil {
		return fmt.Errorf("read components.json: %w", err)
	}
	var cfg map[string]any
	if err := json.Unmarshal(data, &cfg); err != nil {
		return fmt.Errorf("parse components.json: %w", err)
	}
	tw, _ := cfg["tailwind"].(map[string]any)
	if tw == nil {
		tw = map[string]any{}
		cfg["tailwind"] = tw
	}
	tw["baseColor"] = color
	out, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return err
	}
	out = append(out, '\n')
	return in.Runner.WriteFile(path, out, 0o644)
}
