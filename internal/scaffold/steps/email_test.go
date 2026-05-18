package steps

import (
	"context"
	"testing"

	"github.com/mikekenway/create-ekko-app/internal/options"
)

func TestBuildEmailBoth(t *testing.T) {
	fr := &recordingRunner{}
	steps := BuildEmail(Input{
		ProjectPath: "/p",
		Cfg:         options.Config{Tooling: []options.ToolingOption{options.ToolResend, options.ToolReactEmail}},
		Runner:      fr,
	})
	if len(steps) != 2 {
		t.Fatalf("want 2 steps, got %d", len(steps))
	}
	for _, s := range steps {
		_ = s.Run(context.Background(), nil)
	}
	if _, ok := fr.files["/p/src/lib/resend.ts"]; !ok {
		t.Fatal("resend lib missing")
	}
	if _, ok := fr.files["/p/src/emails/welcome.tsx"]; !ok {
		t.Fatal("welcome email missing")
	}
}

func TestBuildEmailResendOnly(t *testing.T) {
	fr := &recordingRunner{}
	steps := BuildEmail(Input{
		ProjectPath: "/p",
		Cfg:         options.Config{Tooling: []options.ToolingOption{options.ToolResend}},
		Runner:      fr,
	})
	if len(steps) != 1 {
		t.Fatalf("want 1 step, got %d", len(steps))
	}
}

func TestBuildEmailNone(t *testing.T) {
	fr := &recordingRunner{}
	steps := BuildEmail(Input{Cfg: options.Config{}, Runner: fr, ProjectPath: "/p"})
	if len(steps) != 0 {
		t.Fatalf("want 0 steps, got %d", len(steps))
	}
}
