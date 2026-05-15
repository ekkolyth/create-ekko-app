package steps

import (
	"context"
	"testing"

	"github.com/mikekenway/create-ekko-app/internal/options"
)

func TestBuildConvexNext(t *testing.T) {
	fr := &recordingRunner{}
	steps := BuildConvex(Input{
		ProjectPath: "/p",
		Cfg:         options.Config{Framework: options.FrameworkNext},
		Runner:      fr,
	})
	if len(steps) != 3 {
		t.Fatalf("want 3 steps, got %d", len(steps))
	}
	for _, s := range steps {
		_ = s.Run(context.Background(), nil)
	}
	if _, ok := fr.files["/p/src/providers/convex-provider.tsx"]; !ok {
		t.Fatal("provider missing")
	}
	last := fr.execs[len(fr.execs)-1]
	if last.name != "bunx" || last.args[0] != "convex" {
		t.Fatalf("expected bunx convex dev last, got %v", last)
	}
}

func TestBuildConvexTanstack(t *testing.T) {
	fr := &recordingRunner{}
	steps := BuildConvex(Input{
		ProjectPath: "/p",
		Cfg:         options.Config{Framework: options.FrameworkTanstackStart},
		Runner:      fr,
	})
	for _, s := range steps {
		_ = s.Run(context.Background(), nil)
	}
	if _, ok := fr.files["/p/src/integrations/convex.tsx"]; !ok {
		t.Fatal("tanstack convex integration missing")
	}
}
