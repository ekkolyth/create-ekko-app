package steps

import (
	"context"
	"testing"

	"github.com/mikekenway/create-ekko-app/internal/options"
)

func TestBuildConvexInstallNext(t *testing.T) {
	fr := &recordingRunner{}
	steps := BuildConvexInstall(Input{
		ProjectPath: "/p",
		Cfg:         options.Config{Framework: options.FrameworkNext},
		Runner:      fr,
	})
	if len(steps) != 2 {
		t.Fatalf("want 2 steps, got %d", len(steps))
	}
	for _, s := range steps {
		_ = s.Run(context.Background(), nil)
	}
	if _, ok := fr.files["/p/src/providers/convex-provider.tsx"]; !ok {
		t.Fatal("provider missing")
	}
}

func TestBuildConvexInstallTanstack(t *testing.T) {
	fr := &recordingRunner{}
	steps := BuildConvexInstall(Input{
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

func TestBuildConvexProvisionLast(t *testing.T) {
	fr := &recordingRunner{}
	step := BuildConvexProvision(Input{ProjectPath: "/p", Runner: fr})
	if err := step.Run(context.Background(), nil); err != nil {
		t.Fatal(err)
	}
	if fr.execs[0].name != "bunx" || fr.execs[0].args[0] != "convex" {
		t.Fatalf("expected bunx convex dev, got %v", fr.execs[0])
	}
}
