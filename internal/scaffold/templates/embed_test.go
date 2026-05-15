package templates

import (
	"strings"
	"testing"
)

func TestRenderBiome(t *testing.T) {
	out, err := Render("common/biome.json.tmpl", nil)
	if err != nil {
		t.Fatalf("render: %v", err)
	}
	if len(out) == 0 {
		t.Fatal("empty output")
	}
	if !strings.Contains(string(out), "biomejs.dev") {
		t.Fatalf("expected biome schema URL in output:\n%s", out)
	}
}

func TestRenderMissingTemplateErrors(t *testing.T) {
	_, err := Render("common/nope.tmpl", nil)
	if err == nil {
		t.Fatal("expected error for missing template")
	}
}
