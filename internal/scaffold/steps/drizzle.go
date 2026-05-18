package steps

import (
	"context"
	"fmt"

	"github.com/mikekenway/create-ekko-app/internal/scaffold/templates"
)

// BuildDrizzle installs deps, writes config + schema + db client + docker-compose.
func BuildDrizzle(in Input) Step {
	return Step{
		Title: "Install and configure Drizzle (Postgres)",
		EnvKeys: []EnvKey{
			{
				Section: "Drizzle",
				Key:     "DATABASE_URL",
				Value:   fmt.Sprintf("postgres://postgres:postgres@localhost:5432/%s", in.Cfg.ProjectName),
			},
		},
		Run: func(ctx context.Context, write func(string)) error {
			if err := in.Runner.Exec(ctx, in.ProjectPath, "bun",
				[]string{"add", "drizzle-orm", "pg"}, write); err != nil {
				return err
			}
			if err := in.Runner.Exec(ctx, in.ProjectPath, "bun",
				[]string{"add", "-d", "drizzle-kit", "@types/pg"}, write); err != nil {
				return err
			}

			data := map[string]any{"ProjectName": in.Cfg.ProjectName}
			files := []struct {
				path string
				tmpl string
			}{
				{"drizzle.config.ts", "common/drizzle.config.ts.tmpl"},
				{"src/db/index.ts", "common/db-index.ts.tmpl"},
				{"src/db/schema.ts", "common/db-schema.ts.tmpl"},
				{"docker-compose.yml", "common/docker-compose.yml.tmpl"},
			}
			for _, f := range files {
				body, err := templates.Render(f.tmpl, data)
				if err != nil {
					return err
				}
				if err := in.Runner.WriteFile(Join(in.ProjectPath, f.path), body, 0o644); err != nil {
					return err
				}
			}
			return nil
		},
	}
}
