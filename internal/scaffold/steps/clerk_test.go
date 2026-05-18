package steps

import (
	"context"
	"testing"

	"github.com/mikekenway/create-ekko-app/internal/options"
)

func TestBuildClerkNext(t *testing.T) {
	fr := &recordingRunner{}
	step := BuildClerk(Input{
		ProjectPath: "/p",
		Cfg:         options.Config{Framework: options.FrameworkNext},
		Runner:      fr,
	})
	if err := step.Run(context.Background(), nil); err != nil {
		t.Fatal(err)
	}
	if len(fr.execs) != 1 || fr.execs[0].args[1] != "@clerk/nextjs" {
		t.Fatalf("expected clerk/nextjs add, got %v", fr.execs)
	}
	want := []string{
		"/p/src/middleware.ts",
		"/p/src/app/sign-in/[[...sign-in]]/page.tsx",
		"/p/src/app/sign-up/[[...sign-up]]/page.tsx",
	}
	for _, p := range want {
		if _, ok := fr.files[p]; !ok {
			t.Fatalf("missing file %s", p)
		}
	}
	if len(step.EnvKeys) != 2 {
		t.Fatalf("expected 2 env keys, got %d", len(step.EnvKeys))
	}
}

func TestBuildClerkTanstack(t *testing.T) {
	fr := &recordingRunner{}
	step := BuildClerk(Input{
		ProjectPath: "/p",
		Cfg:         options.Config{Framework: options.FrameworkTanstackStart},
		Runner:      fr,
	})
	_ = step.Run(context.Background(), nil)
	if fr.execs[0].args[1] != "@clerk/tanstack-react-start" {
		t.Fatalf("expected tanstack clerk pkg, got %v", fr.execs[0].args)
	}
	if _, ok := fr.files["/p/src/integrations/clerk.tsx"]; !ok {
		t.Fatal("clerk integration not written")
	}
}

func TestBuildClerkEnvKeyForTanstack(t *testing.T) {
	step := BuildClerk(Input{
		ProjectPath: "/p",
		Cfg:         options.Config{Framework: options.FrameworkTanstackStart},
	})
	var foundVite bool
	for _, k := range step.EnvKeys {
		if k.Key == "VITE_CLERK_PUBLISHABLE_KEY" {
			foundVite = true
		}
		if k.Key == "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" {
			t.Fatal("TanStack Start should not emit NEXT_PUBLIC key")
		}
	}
	if !foundVite {
		t.Fatal("expected VITE_CLERK_PUBLISHABLE_KEY for TanStack Start")
	}
}

func TestBuildClerkEnvKeyForNext(t *testing.T) {
	step := BuildClerk(Input{
		ProjectPath: "/p",
		Cfg:         options.Config{Framework: options.FrameworkNext},
	})
	var foundNext bool
	for _, k := range step.EnvKeys {
		if k.Key == "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" {
			foundNext = true
		}
	}
	if !foundNext {
		t.Fatal("expected NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY for Next.js")
	}
}
