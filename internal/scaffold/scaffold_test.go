package scaffold

import (
	"testing"

	"github.com/mikekenway/create-ekko-app/internal/options"
	"github.com/mikekenway/create-ekko-app/internal/scaffold/steps"
)

func TestBuildPlanFullStackNext(t *testing.T) {
	cfg := options.Config{
		ProjectName: "demo",
		Framework:   options.FrameworkNext,
		Auth:        options.AuthBetterAuth,
		Database:    options.DatabaseDrizzle,
		Tooling: []options.ToolingOption{
			options.ToolBiome, options.ToolZod,
			options.ToolShadcn,
			options.ToolReactEmail, options.ToolResend,
			options.ToolTanstackQuery, options.ToolTanstackForm,
		},
	}
	cfg.Normalize()
	in := steps.Input{Cfg: cfg, ProjectPath: "/p"}
	plan := buildPlan(in)
	if len(plan) == 0 {
		t.Fatal("empty plan")
	}
	if plan[len(plan)-1].Title != "Write .env.local" {
		t.Fatalf("expected env last, got %s", plan[len(plan)-1].Title)
	}
}

func TestBuildPlanMinimalNext(t *testing.T) {
	cfg := options.Config{ProjectName: "demo", Framework: options.FrameworkNext}
	cfg.Normalize()
	in := steps.Input{Cfg: cfg, ProjectPath: "/p"}
	plan := buildPlan(in)
	if plan[0].Title != "Create Next.js project" {
		t.Fatalf("expected Next first, got %s", plan[0].Title)
	}
	if plan[len(plan)-1].Title != "Write .env.local" {
		t.Fatalf("expected env last, got %s", plan[len(plan)-1].Title)
	}
}

func TestBuildPlanTanstackBaseFirst(t *testing.T) {
	cfg := options.Config{ProjectName: "demo", Framework: options.FrameworkTanstackStart}
	cfg.Normalize()
	plan := buildPlan(steps.Input{Cfg: cfg, ProjectPath: "/p"})
	if plan[0].Title != "Create TanStack Start project" {
		t.Fatalf("expected TanStack first, got %s", plan[0].Title)
	}
}

func TestBetterAuthForcesDrizzleInPlan(t *testing.T) {
	cfg := options.Config{
		ProjectName: "demo", Framework: options.FrameworkNext,
		Auth: options.AuthBetterAuth, Database: options.DatabaseNone,
	}
	cfg.Normalize()
	if cfg.Database != options.DatabaseDrizzle {
		t.Fatal("Normalize did not coerce DB to Drizzle")
	}
	plan := buildPlan(steps.Input{Cfg: cfg, ProjectPath: "/p"})
	var hasDrizzle bool
	for _, s := range plan {
		if s.Title == "Install and configure Drizzle (Postgres)" {
			hasDrizzle = true
		}
	}
	if !hasDrizzle {
		t.Fatal("plan missing drizzle step")
	}
}

func TestBuildPlanConvexProvisionRunsAfterEnv(t *testing.T) {
	cfg := options.Config{
		ProjectName: "demo", Framework: options.FrameworkNext, Database: options.DatabaseConvex,
	}
	cfg.Normalize()
	plan := buildPlan(steps.Input{Cfg: cfg, ProjectPath: "/p"})
	var envIdx, provisionIdx int = -1, -1
	for i, s := range plan {
		if s.Title == "Write .env.local" {
			envIdx = i
		}
		if s.Title == "Provision Convex deployment" {
			provisionIdx = i
		}
	}
	if envIdx == -1 || provisionIdx == -1 {
		t.Fatalf("missing steps; env=%d provision=%d", envIdx, provisionIdx)
	}
	if provisionIdx <= envIdx {
		t.Fatalf("provision (%d) must run after env (%d)", provisionIdx, envIdx)
	}
}

func TestCollectEnvKeysAggregates(t *testing.T) {
	cfg := options.Config{
		ProjectName: "demo", Framework: options.FrameworkNext,
		Auth:    options.AuthClerk,
		Tooling: []options.ToolingOption{options.ToolResend},
	}
	cfg.Normalize()
	plan := buildPlan(steps.Input{Cfg: cfg, ProjectPath: "/p"})
	keys := collectEnvKeys(plan)
	var hasClerk, hasResend bool
	for _, key := range keys {
		if key.Section == "Clerk" {
			hasClerk = true
		}
		if key.Section == "Resend" {
			hasResend = true
		}
	}
	if !hasClerk || !hasResend {
		t.Fatalf("missing env sections: clerk=%v resend=%v", hasClerk, hasResend)
	}
}
