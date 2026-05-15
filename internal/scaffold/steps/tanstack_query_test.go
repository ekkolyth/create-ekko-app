package steps

import (
	"context"
	"testing"

	"github.com/mikekenway/create-ekko-app/internal/options"
)

func TestBuildTanstackQueryNextWritesProvider(t *testing.T) {
	fr := &recordingRunner{}
	step := BuildTanstackQuery(Input{
		ProjectPath: "/p",
		Cfg:         options.Config{Framework: options.FrameworkNext},
		Runner:      fr,
	})
	if err := step.Run(context.Background(), nil); err != nil {
		t.Fatal(err)
	}
	if _, ok := fr.files["/p/src/providers/query-provider.tsx"]; !ok {
		t.Fatal("query-provider not written")
	}
}

func TestBuildTanstackQueryTanstackSkipsProvider(t *testing.T) {
	fr := &recordingRunner{}
	step := BuildTanstackQuery(Input{
		ProjectPath: "/p",
		Cfg:         options.Config{Framework: options.FrameworkTanstackStart},
		Runner:      fr,
	})
	_ = step.Run(context.Background(), nil)
	if len(fr.files) != 0 {
		t.Fatalf("expected no files, got %v", fr.files)
	}
}
