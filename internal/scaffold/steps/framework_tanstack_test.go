package steps

import (
	"context"
	"testing"

	"github.com/mikekenway/create-ekko-app/internal/options"
)

func TestBuildFrameworkTanstack(t *testing.T) {
	fr := &recordingRunner{}
	step := BuildFrameworkTanstack(Input{
		Cfg:    options.Config{ProjectName: "demo", Framework: options.FrameworkTanstackStart},
		Runner: fr,
	})
	if err := step.Run(context.Background(), nil); err != nil {
		t.Fatalf("run: %v", err)
	}
	if len(fr.execs) != 1 {
		t.Fatalf("want 1 exec, got %d", len(fr.execs))
	}
	want := []string{"create", "@tanstack/start@latest", "demo"}
	if !stringSliceEq(fr.execs[0].args, want) || fr.execs[0].name != "bun" {
		t.Fatalf("args mismatch: %v", fr.execs[0])
	}
}
