package steps

import (
	"context"
	"testing"

	"github.com/mikekenway/create-ekko-app/internal/options"
)

func TestBuildFrameworkNext(t *testing.T) {
	fr := &recordingRunner{}
	step := BuildFrameworkNext(Input{
		Cfg:    options.Config{ProjectName: "demo", Framework: options.FrameworkNext},
		Runner: fr,
	})
	if step.Title == "" {
		t.Fatal("title missing")
	}
	if err := step.Run(context.Background(), nil); err != nil {
		t.Fatalf("run: %v", err)
	}
	if len(fr.execs) != 1 {
		t.Fatalf("want 1 exec, got %d", len(fr.execs))
	}
	got := fr.execs[0]
	if got.name != "bunx" {
		t.Fatalf("want bunx, got %s", got.name)
	}
	want := []string{
		"create-next-app@latest", "demo",
		"--app", "--ts", "--tailwind",
		"--src-dir", "--import-alias", "@/*",
		"--use-bun", "--turbopack", "--no-eslint", "--yes",
	}
	if !stringSliceEq(got.args, want) {
		t.Fatalf("args mismatch\nwant %v\n got %v", want, got.args)
	}
}
