package steps

import (
	"context"
	"fmt"

	"github.com/mikekenway/create-ekko-app/internal/scaffold/templates"
)

func BuildBiome(in Input) Step {
	return Step{
		Title: "Install and configure Biome",
		Run: func(ctx context.Context, write func(string)) error {
			if err := in.Runner.Exec(ctx, in.ProjectPath, "bun",
				[]string{"add", "-d", "-E", "@biomejs/biome"}, write); err != nil {
				return fmt.Errorf("bun add biome: %w", err)
			}
			content, err := templates.Render("common/biome.json.tmpl", nil)
			if err != nil {
				return err
			}
			return in.Runner.WriteFile(Join(in.ProjectPath, "biome.json"), content, 0o644)
		},
	}
}
