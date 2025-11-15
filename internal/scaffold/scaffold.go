package scaffold

import (
	"bufio"
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"slices"
	"strings"
	"sync"

	"github.com/charmbracelet/log"

	"github.com/mikekenway/create-ekko-app/internal/options"
)

// Run executes the scaffolding workflow using the provided selections.
func Run(ctx context.Context, cfg options.Config, logger *log.Logger) error {
	if cfg.ProjectName == "" {
		return errors.New("project name is required")
	}

	runner, err := newRunner(ctx, logger)
	if err != nil {
		return err
	}

	steps, err := runner.buildSteps(cfg)
	if err != nil {
		return err
	}

	if len(steps) == 0 {
		return errors.New("no steps to execute")
	}

	if err := runInstallUI(ctx, steps); err != nil {
		return err
	}

	projectPath := filepath.Join(runner.cwd, cfg.ProjectName)
	runner.openVSCode(projectPath)
	runner.printNextSteps(cfg.ProjectName)

	return nil
}

type installStep struct {
	title string
	run   func(context.Context, func(string)) error
}

type runner struct {
	ctx    context.Context
	logger *log.Logger
	cwd    string
}

func newRunner(ctx context.Context, logger *log.Logger) (*runner, error) {
	cwd, err := os.Getwd()
	if err != nil {
		return nil, fmt.Errorf("resolve working directory: %w", err)
	}

	return &runner{
		ctx:    ctx,
		logger: logger,
		cwd:    cwd,
	}, nil
}

func (r *runner) buildSteps(cfg options.Config) ([]installStep, error) {
	projectPath := filepath.Join(r.cwd, cfg.ProjectName)
	var steps []installStep

	projectReady := false

	steps = append(steps, installStep{
		title: fmt.Sprintf("Create %s project", describeFramework(cfg.Framework)),
		run: func(ctx context.Context, write func(string)) error {
			if err := r.scaffoldFramework(write, cfg); err != nil {
				return err
			}
			if err := r.ensureProjectPath(projectPath); err != nil {
				return err
			}
			projectReady = true
			return nil
		},
	})

	if deps := collectDependencies(cfg); len(deps) > 0 {
		steps = append(steps, installStep{
			title: "Install selected dependencies",
			run: func(ctx context.Context, write func(string)) error {
				if !projectReady {
					return errors.New("project directory missing; previous step failed")
				}
				return r.installDependencies(projectPath, deps, write)
			},
		})
	}

	steps = append(steps, r.shadcnSteps(projectPath, cfg)...)

	return steps, nil
}

func describeFramework(f options.Framework) string {
	if f == options.FrameworkTanstackStart {
		return "TanStack Start"
	}
	return "Next.js"
}

func (r *runner) scaffoldFramework(write func(string), cfg options.Config) error {
	switch cfg.Framework {
	case options.FrameworkTanstackStart:
		return r.exec(write, "", "pnpm", "create", "@tanstack/start@latest", cfg.ProjectName)
	default:
		return r.exec(write,
			"pnpm",
			"dlx",
			"create-next-app@latest",
			cfg.ProjectName,
			"--app",
			"--ts",
			"--tailwind",
			"--eslint",
			"--turbopack",
			"--src-dir",
			"--use-pnpm",
			"--import-alias",
			"@/*",
		)
	}
}

func (r *runner) ensureProjectPath(path string) error {
	if _, err := os.Stat(path); err != nil {
		return fmt.Errorf("project directory missing at %s: %w", path, err)
	}
	return nil
}

func (r *runner) installDependencies(projectPath string, deps []string, write func(string)) error {
	if len(deps) == 0 {
		return nil
	}

	args := append([]string{"add"}, deps...)
	return r.exec(write, projectPath, "pnpm", args...)
}

func (r *runner) shadcnSteps(projectPath string, cfg options.Config) []installStep {
	if cfg.SkipShadcnOps || !hasTool(cfg.Tooling, options.ToolShadcn) {
		return nil
	}

	if cfg.Framework != options.FrameworkNext {
		return []installStep{
			{
				title: "shadcn automation",
				run: func(_ context.Context, write func(string)) error {
					write("ℹ️ shadcn automation currently targets Next.js. Skipping for TanStack Start.\n")
					return nil
				},
			},
		}
	}

	color := defaultColor(cfg.ShadcnColor)
	shadcnReady := true

	initStep := installStep{
		title: fmt.Sprintf("Initialize shadcn (%s)", color),
		run: func(ctx context.Context, write func(string)) error {
			err := r.exec(write, projectPath, "pnpm", "dlx", "shadcn@latest", "init", "-y", "--base-color", color)
			if err != nil {
				shadcnReady = false
				write("⚠️ shadcn init failed. You can rerun: pnpm dlx shadcn@latest init\n")
				return nil
			}
			return nil
		},
	}

	addStep := installStep{
		title: "Install shadcn components",
		run: func(ctx context.Context, write func(string)) error {
			if !shadcnReady {
				write("ℹ️ Skipping component installation because shadcn init failed.\n")
				return nil
			}
			err := r.exec(write, projectPath, "pnpm", "dlx", "shadcn@latest", "add", "--all", "-y")
			if err != nil {
				write("⚠️ shadcn component install failed. You can rerun: pnpm dlx shadcn@latest add --all\n")
				return nil
			}
			return nil
		},
	}

	return []installStep{initStep, addStep}
}

func (r *runner) openVSCode(projectPath string) {
	cmd := exec.CommandContext(r.ctx, "code", ".")
	cmd.Dir = projectPath
	cmd.Stdout = io.Discard
	cmd.Stderr = io.Discard
	cmd.Stdin = nil

	if err := cmd.Run(); err != nil {
		r.logger.Info("VS Code command-line tool not found. To open the project, run:",
			"hint", fmt.Sprintf("cd %s && code .", projectPath))
		return
	}

	r.logger.Info("Opened in VS Code (code .).")
}

func (r *runner) printNextSteps(projectName string) {
	r.logger.Info("Done! Your app is ready.")
	r.logger.Info("Next steps:")
	r.logger.Infof("  cd %s", projectName)
	r.logger.Info("  pnpm dev")
}

func (r *runner) exec(write func(string), dir string, name string, args ...string) error {
	cmd := exec.CommandContext(r.ctx, name, args...)
	if dir != "" {
		cmd.Dir = dir
	}
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return err
	}
	stderr, err := cmd.StderrPipe()
	if err != nil {
		return err
	}
	cmd.Stdin = os.Stdin

	write(fmt.Sprintf("$ %s %s\n", name, strings.Join(args, " ")))

	if err := cmd.Start(); err != nil {
		return fmt.Errorf("start %s: %w", name, err)
	}

	var wg sync.WaitGroup
	copyPipe := func(r io.Reader) {
		defer wg.Done()
		scanner := bufio.NewScanner(r)
		for scanner.Scan() {
			write(scanner.Text() + "\n")
		}
		if err := scanner.Err(); err != nil {
			write(err.Error() + "\n")
		}
	}

	wg.Add(2)
	go copyPipe(stdout)
	go copyPipe(stderr)
	wg.Wait()

	if err := cmd.Wait(); err != nil {
		return fmt.Errorf("run %s %s: %w", name, strings.Join(args, " "), err)
	}

	return nil
}

func collectDependencies(cfg options.Config) []string {
	var deps []string
	if hasTool(cfg.Tooling, options.ToolShadcn) {
		deps = append(deps,
			"class-variance-authority",
			"clsx",
			"tailwindcss-animate",
			"lucide-react",
			"tailwind-merge",
		)
	}

	switch cfg.Auth {
	case options.AuthClerk:
		if cfg.Framework == options.FrameworkNext {
			deps = append(deps, "@clerk/nextjs")
		} else {
			deps = append(deps, "@clerk/clerk-react")
		}
	case options.AuthBetterAuth:
		deps = append(deps, "better-auth")
	}

	switch cfg.Database {
	case options.DatabaseConvex:
		deps = append(deps, "convex")
	case options.DatabaseDrizzle:
		deps = append(deps, "drizzle-orm")
	}

	if hasTool(cfg.Tooling, options.ToolReactEmail) {
		deps = append(deps, "@react-email/components", "@react-email/render")
	}

	if hasTool(cfg.Tooling, options.ToolResend) {
		deps = append(deps, "resend")
	}

	if hasTool(cfg.Tooling, options.ToolTanstackQuery) {
		deps = append(deps, "@tanstack/react-query")
	}

	if hasTool(cfg.Tooling, options.ToolTanstackForm) {
		deps = append(deps, "@tanstack/react-form")
	}

	return deps
}

func hasTool(tooling []options.ToolingOption, needle options.ToolingOption) bool {
	return slices.Contains(tooling, needle)
}

func defaultColor(value string) string {
	if strings.TrimSpace(value) == "" {
		return "zinc"
	}
	return value
}
