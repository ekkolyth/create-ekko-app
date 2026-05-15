package steps

import (
	"context"
	"strings"
	"testing"

	"github.com/mikekenway/create-ekko-app/internal/options"
)

func TestBuildTanstackFormWithZod(t *testing.T) {
	fr := &recordingRunner{}
	step := BuildTanstackForm(Input{
		ProjectPath: "/p",
		Cfg:         options.Config{Tooling: []options.ToolingOption{options.ToolZod}},
		Runner:      fr,
	})
	if err := step.Run(context.Background(), nil); err != nil {
		t.Fatal(err)
	}
	body := string(fr.files["/p/src/components/example-form.tsx"])
	if !strings.Contains(body, "import { z }") {
		t.Fatal("expected zod import when zod selected")
	}
}

func TestBuildTanstackFormWithoutZod(t *testing.T) {
	fr := &recordingRunner{}
	step := BuildTanstackForm(Input{ProjectPath: "/p", Runner: fr})
	_ = step.Run(context.Background(), nil)
	body := string(fr.files["/p/src/components/example-form.tsx"])
	if strings.Contains(body, "import { z }") {
		t.Fatal("did not expect zod import")
	}
}
