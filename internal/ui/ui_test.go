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

func TestBuildSummaryItemsIncludesBiomeAndZod(t *testing.T) {
	cfg := options.Config{
		ProjectName: "demo",
		Framework:   options.FrameworkNext,
		Tooling: []options.ToolingOption{
			options.ToolBiome, options.ToolZod,
		},
	}
	items := buildSummaryItems(cfg)
	var hasBiome, hasZod bool
	for _, it := range items {
		if it == "Biome" {
			hasBiome = true
		}
		if it == "Zod" {
			hasZod = true
		}
	}
	if !hasBiome || !hasZod {
		t.Fatalf("expected Biome+Zod in summary, got %v", items)
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

func TestExpandSelectAllReturnsAllTools(t *testing.T) {
	got := expandSelectAll([]string{selectAllValue})
	want := allToolingValues()
	if !slices.Equal(got, want) {
		t.Fatalf("expected full tool list, got %v", got)
	}
}

func TestExpandSelectAllWithMixedInput(t *testing.T) {
	// sentinel present alongside other picks: still expand to full set
	got := expandSelectAll([]string{string(options.ToolZod), selectAllValue})
	want := allToolingValues()
	if !slices.Equal(got, want) {
		t.Fatalf("expected full tool list, got %v", got)
	}
}

func TestExpandSelectAllPassthrough(t *testing.T) {
	in := []string{string(options.ToolBiome), string(options.ToolZod)}
	got := expandSelectAll(in)
	if !slices.Equal(got, in) {
		t.Fatalf("expected unchanged, got %v", got)
	}
}

func TestToToolingOptionsDropsSentinel(t *testing.T) {
	got := toToolingOptions([]string{selectAllValue, string(options.ToolBiome)})
	want := []options.ToolingOption{options.ToolBiome}
	if !slices.Equal(got, want) {
		t.Fatalf("sentinel should be stripped, got %v", got)
	}
}
