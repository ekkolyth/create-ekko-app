package steps

import (
	"context"
	"encoding/json"
	"strings"
	"testing"

	"github.com/mikekenway/create-ekko-app/internal/options"
)

func TestBuildShadcnInitArgs(t *testing.T) {
	fr := &recordingRunner{}
	// Pre-seed components.json so the patch step can read it
	fr.files = map[string][]byte{
		"/p/components.json": []byte(`{"tailwind":{"baseColor":"neutral"}}`),
	}
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
	wantInit := []string{"shadcn@latest", "init", "-y", "-d"}
	wantAdd := []string{"shadcn@latest", "add", "--all", "-y"}
	if !stringSliceEq(fr.execs[0].args, wantInit) {
		t.Fatalf("init args: %v", fr.execs[0].args)
	}
	if !stringSliceEq(fr.execs[1].args, wantAdd) {
		t.Fatalf("add args: %v", fr.execs[1].args)
	}
}

func TestBuildShadcnPatchesBaseColor(t *testing.T) {
	fr := &recordingRunner{}
	fr.files = map[string][]byte{
		"/p/components.json": []byte(`{"tailwind":{"baseColor":"neutral"},"style":"new-york"}`),
	}
	steps := BuildShadcn(Input{
		ProjectPath: "/p",
		Cfg:         options.Config{ShadcnColor: "slate"},
		Runner:      fr,
	})
	if err := steps[0].Run(context.Background(), nil); err != nil {
		t.Fatal(err)
	}
	body := string(fr.files["/p/components.json"])
	if !strings.Contains(body, `"baseColor": "slate"`) {
		t.Fatalf("expected baseColor patched to slate, got:\n%s", body)
	}
	// Ensure other fields preserved
	var cfg map[string]any
	if err := json.Unmarshal([]byte(body), &cfg); err != nil {
		t.Fatal(err)
	}
	if cfg["style"] != "new-york" {
		t.Fatalf("style field lost: %v", cfg)
	}
}

func TestBuildShadcnDefaultsZinc(t *testing.T) {
	fr := &recordingRunner{}
	fr.files = map[string][]byte{
		"/p/components.json": []byte(`{"tailwind":{"baseColor":"neutral"}}`),
	}
	steps := BuildShadcn(Input{ProjectPath: "/p", Runner: fr})
	if err := steps[0].Run(context.Background(), nil); err != nil {
		t.Fatal(err)
	}
	body := string(fr.files["/p/components.json"])
	if !strings.Contains(body, `"baseColor": "zinc"`) {
		t.Fatalf("expected default zinc, got:\n%s", body)
	}
}
