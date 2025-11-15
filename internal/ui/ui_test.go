package ui

import (
	"slices"
	"testing"

	"github.com/mikekenway/create-ekko-app/internal/options"
)

func TestBuildSummaryItems(t *testing.T) {
	cfg := options.Config{
		ProjectName: "demo",
		Framework:   options.FrameworkNext,
		Auth:        options.AuthClerk,
		Database:    options.DatabaseConvex,
		Tooling: []options.ToolingOption{
			options.ToolShadcn,
			options.ToolResend,
		},
		ShadcnColor: "slate",
	}

	items := buildSummaryItems(cfg)
	if len(items) != 6 {
		t.Fatalf("expected 6 summary rows, got %d", len(items))
	}

	want := []string{"demo", "Next.js", "Clerk", "Convex", "shadcn (slate)", "Resend"}
	if !slices.Equal(items, want) {
		t.Fatalf("unexpected items %v", items)
	}
}

func TestToToolingOptions(t *testing.T) {
	items := []string{
		string(options.ToolShadcn),
		string(options.ToolReactEmail),
	}
	got := toToolingOptions(items)
	want := []options.ToolingOption{
		options.ToolShadcn,
		options.ToolReactEmail,
	}
	if !slices.Equal(got, want) {
		t.Fatalf("unexpected tooling slice: %v", got)
	}
}
