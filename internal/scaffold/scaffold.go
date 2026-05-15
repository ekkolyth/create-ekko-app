package scaffold

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"

	"github.com/charmbracelet/log"

	"github.com/mikekenway/create-ekko-app/internal/options"
	"github.com/mikekenway/create-ekko-app/internal/scaffold/steps"
)

// Run executes the scaffolding workflow.
func Run(ctx context.Context, cfg options.Config, logger *log.Logger) error {
	cfg.Normalize()
	if cfg.ProjectName == "" {
		return errors.New("project name is required")
	}

	cwd, err := os.Getwd()
	if err != nil {
		return fmt.Errorf("resolve working directory: %w", err)
	}
	projectPath := filepath.Join(cwd, cfg.ProjectName)

	runner := NewRunner()
	in := steps.Input{
		Ctx:         ctx,
		Cfg:         cfg,
		ProjectPath: projectPath,
		Runner:      adaptForSteps(runner),
	}

	plan := buildPlan(in)
	if len(plan) == 0 {
		return errors.New("no steps to execute")
	}

	if err := runInstallUI(ctx, toInstallSteps(plan)); err != nil {
		return err
	}

	logger.Info("Done! Your app is ready.")
	logger.Info("Next steps:")
	logger.Infof("  cd %s", cfg.ProjectName)
	if cfg.Database == options.DatabaseDrizzle {
		logger.Info("  docker compose up -d                  # start Postgres")
		logger.Info("  bunx drizzle-kit push                 # sync schema to db (dev)")
	}
	logger.Info("  bun dev")
	return nil
}

// buildPlan composes the full list of steps from the selected options.
func buildPlan(in steps.Input) []steps.Step {
	cfg := in.Cfg
	var plan []steps.Step

	switch cfg.Framework {
	case options.FrameworkTanstackStart:
		plan = append(plan, steps.BuildFrameworkTanstack(in))
	default:
		plan = append(plan, steps.BuildFrameworkNext(in))
	}

	if cfg.HasTool(options.ToolBiome) {
		plan = append(plan, steps.BuildBiome(in))
	}
	if cfg.HasTool(options.ToolZod) {
		plan = append(plan, steps.BuildZod(in))
	}

	switch cfg.Database {
	case options.DatabaseConvex:
		plan = append(plan, steps.BuildConvex(in)...)
	case options.DatabaseDrizzle:
		plan = append(plan, steps.BuildDrizzle(in))
	}

	switch cfg.Auth {
	case options.AuthClerk:
		plan = append(plan, steps.BuildClerk(in))
	case options.AuthBetterAuth:
		plan = append(plan, steps.BuildBetterAuth(in)...)
	}

	plan = append(plan, steps.BuildEmail(in)...)

	if cfg.HasTool(options.ToolTanstackQuery) {
		plan = append(plan, steps.BuildTanstackQuery(in))
	}
	if cfg.HasTool(options.ToolTanstackForm) {
		plan = append(plan, steps.BuildTanstackForm(in))
	}
	if cfg.HasTool(options.ToolShadcn) {
		plan = append(plan, steps.BuildShadcn(in)...)
	}

	keys := collectEnvKeys(plan)
	plan = append(plan, steps.BuildEnvLocal(in, keys))
	return plan
}

func collectEnvKeys(plan []steps.Step) []steps.EnvKey {
	var keys []steps.EnvKey
	for _, s := range plan {
		keys = append(keys, s.EnvKeys...)
	}
	return keys
}

func toInstallSteps(plan []steps.Step) []installStep {
	out := make([]installStep, len(plan))
	for i, s := range plan {
		s := s
		out[i] = installStep{title: s.Title, run: s.Run}
	}
	return out
}
