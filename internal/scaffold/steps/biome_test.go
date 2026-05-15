package steps

import (
	"context"
	"strings"
	"testing"
)

func TestBuildBiome(t *testing.T) {
	fr := &recordingRunner{}
	step := BuildBiome(Input{ProjectPath: "/tmp/demo", Runner: fr})
	if err := step.Run(context.Background(), nil); err != nil {
		t.Fatalf("run: %v", err)
	}
	if len(fr.execs) != 1 || fr.execs[0].name != "bun" || fr.execs[0].args[0] != "add" {
		t.Fatalf("expected one bun add, got %v", fr.execs)
	}
	body, ok := fr.files["/tmp/demo/biome.json"]
	if !ok {
		t.Fatal("biome.json not written")
	}
	if !strings.Contains(string(body), "biomejs.dev") {
		t.Fatal("biome.json content missing schema URL")
	}
}
