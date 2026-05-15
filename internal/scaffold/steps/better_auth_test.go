package steps

import (
	"context"
	"testing"

	"github.com/mikekenway/create-ekko-app/internal/options"
)

func TestBuildBetterAuthNext(t *testing.T) {
	fr := &recordingRunner{}
	steps := BuildBetterAuth(Input{
		ProjectPath: "/p",
		Cfg:         options.Config{Framework: options.FrameworkNext},
		Runner:      fr,
	})
	if len(steps) != 3 {
		t.Fatalf("want 3 steps, got %d", len(steps))
	}
	for _, s := range steps {
		_ = s.Run(context.Background(), nil)
	}
	for _, p := range []string{
		"/p/src/lib/auth.ts",
		"/p/src/lib/auth-client.ts",
		"/p/src/app/api/auth/[...all]/route.ts",
	} {
		if _, ok := fr.files[p]; !ok {
			t.Fatalf("missing %s", p)
		}
	}
	if fr.execs[len(fr.execs)-1].args[0] != "@better-auth/cli" {
		t.Fatalf("expected last exec to be schema gen, got %v", fr.execs[len(fr.execs)-1])
	}
}

func TestBuildBetterAuthTanstack(t *testing.T) {
	fr := &recordingRunner{}
	steps := BuildBetterAuth(Input{
		ProjectPath: "/p",
		Cfg:         options.Config{Framework: options.FrameworkTanstackStart},
		Runner:      fr,
	})
	for _, s := range steps {
		_ = s.Run(context.Background(), nil)
	}
	if _, ok := fr.files["/p/src/routes/api/auth.$.ts"]; !ok {
		t.Fatal("tanstack server route not written")
	}
}
