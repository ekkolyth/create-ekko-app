package options

import "testing"

func TestNormalizeBetterAuthForcesDrizzle(t *testing.T) {
	c := Config{Auth: AuthBetterAuth, Database: DatabaseNone}
	c.Normalize()
	if c.Database != DatabaseDrizzle {
		t.Fatalf("expected Drizzle, got %s", c.Database)
	}
}

func TestNormalizeKeepsDrizzleWhenAlreadySet(t *testing.T) {
	c := Config{Auth: AuthBetterAuth, Database: DatabaseDrizzle}
	c.Normalize()
	if c.Database != DatabaseDrizzle {
		t.Fatalf("expected Drizzle, got %s", c.Database)
	}
}

func TestNormalizeLeavesDbAloneWhenNoBetterAuth(t *testing.T) {
	c := Config{Auth: AuthClerk, Database: DatabaseConvex}
	c.Normalize()
	if c.Database != DatabaseConvex {
		t.Fatalf("expected Convex untouched, got %s", c.Database)
	}
}

func TestNormalizeDefaultsShadcnColor(t *testing.T) {
	c := Config{}
	c.Normalize()
	if c.ShadcnColor != "zinc" {
		t.Fatalf("expected zinc, got %q", c.ShadcnColor)
	}
}

func TestNormalizeKeepsExplicitShadcnColor(t *testing.T) {
	c := Config{ShadcnColor: "slate"}
	c.Normalize()
	if c.ShadcnColor != "slate" {
		t.Fatalf("expected slate, got %q", c.ShadcnColor)
	}
}

func TestHasTool(t *testing.T) {
	c := Config{Tooling: []ToolingOption{ToolBiome, ToolZod}}
	if !c.HasTool(ToolBiome) || !c.HasTool(ToolZod) {
		t.Fatal("expected tools present")
	}
	if c.HasTool(ToolShadcn) {
		t.Fatal("did not expect shadcn")
	}
}

func TestHasToolEmpty(t *testing.T) {
	c := Config{}
	if c.HasTool(ToolBiome) {
		t.Fatal("empty config should report no tools")
	}
}
