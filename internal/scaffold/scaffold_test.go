package scaffold

import (
	"slices"
	"testing"

	"github.com/mikekenway/create-ekko-app/internal/options"
)

func TestCollectDependenciesFullStack(t *testing.T) {
	cfg := options.Config{
		Framework: options.FrameworkNext,
		Auth:      options.AuthClerk,
		Database:  options.DatabaseDrizzle,
		Tooling: []options.ToolingOption{
			options.ToolShadcn,
			options.ToolReactEmail,
			options.ToolResend,
			options.ToolTanstackQuery,
			options.ToolTanstackForm,
		},
	}

	got := collectDependencies(cfg)
	want := []string{
		"class-variance-authority",
		"clsx",
		"tailwindcss-animate",
		"lucide-react",
		"tailwind-merge",
		"@clerk/nextjs",
		"drizzle-orm",
		"@react-email/components",
		"@react-email/render",
		"resend",
		"@tanstack/react-query",
		"@tanstack/react-form",
	}

	if !slices.Equal(got, want) {
		t.Fatalf("unexpected deps:\nwant %v\n got %v", want, got)
	}
}

func TestCollectDependenciesTanstackStart(t *testing.T) {
	cfg := options.Config{
		Framework: options.FrameworkTanstackStart,
		Auth:      options.AuthBetterAuth,
		Database:  options.DatabaseConvex,
		Tooling: []options.ToolingOption{
			options.ToolResend,
		},
	}

	got := collectDependencies(cfg)
	want := []string{
		"better-auth",
		"convex",
		"resend",
	}

	if !slices.Equal(got, want) {
		t.Fatalf("unexpected deps:\nwant %v\n got %v", want, got)
	}
}

func TestDefaultColor(t *testing.T) {
	if got := defaultColor(""); got != "zinc" {
		t.Fatalf("expected zinc fallback, got %s", got)
	}
	if got := defaultColor("stone"); got != "stone" {
		t.Fatalf("expected stone, got %s", got)
	}
}
