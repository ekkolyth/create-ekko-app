package steps

import (
	"context"
	"testing"

	"github.com/mikekenway/create-ekko-app/internal/options"
)

func TestBuildShadcnEmitsTwoSteps(t *testing.T) {
	fr := &recordingRunner{}
	steps := BuildShadcn(Input{
		ProjectPath: "/p",
		Cfg:         options.Config{ShadcnColor: "slate"},
		Runner:      fr,
	})
	if len(steps) != 2 {
		t.Fatalf("want 2 steps, got %d", len(steps))
	}
	for _, s := range steps {
		if err := s.Run(context.Background(), nil); err != nil {
			t.Fatalf("run: %v", err)
		}
	}
	if len(fr.execs) != 2 {
		t.Fatalf("want 2 execs, got %d", len(fr.execs))
	}
	want0 := []string{"shadcn@latest", "init", "-y", "--base-color", "slate"}
	want1 := []string{"shadcn@latest", "add", "--all", "-y"}
	if !stringSliceEq(fr.execs[0].args, want0) {
		t.Fatalf("init args: %v", fr.execs[0].args)
	}
	if !stringSliceEq(fr.execs[1].args, want1) {
		t.Fatalf("add args: %v", fr.execs[1].args)
	}
}

func TestBuildShadcnDefaultsZinc(t *testing.T) {
	fr := &recordingRunner{}
	steps := BuildShadcn(Input{ProjectPath: "/p", Runner: fr})
	_ = steps[0].Run(context.Background(), nil)
	got := fr.execs[0].args[4]
	if got != "zinc" {
		t.Fatalf("default color expected zinc, got %s", got)
	}
}
