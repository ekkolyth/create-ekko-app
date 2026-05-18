package steps

import (
	"context"
	"strings"
	"testing"
)

func TestRenderEnvSorted(t *testing.T) {
	keys := []EnvKey{
		{Section: "Resend", Key: "RESEND_API_KEY", Value: "re_..."},
		{Section: "Clerk", Key: "CLERK_SECRET_KEY", Value: "sk_..."},
		{Section: "Clerk", Key: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", Value: "pk_..."},
	}
	body := renderEnv(keys)
	if !strings.HasPrefix(body, "# Clerk") {
		t.Fatalf("expected Clerk first, got:\n%s", body)
	}
	if !strings.Contains(body, "RESEND_API_KEY=re_...") {
		t.Fatal("missing resend key")
	}
}

func TestRenderEnvEmptyValueGetsReplaceMe(t *testing.T) {
	body := renderEnv([]EnvKey{{Section: "X", Key: "FOO"}})
	if !strings.Contains(body, "FOO=REPLACE_ME") {
		t.Fatalf("empty value not replaced:\n%s", body)
	}
}

func TestRenderEnvEmpty(t *testing.T) {
	body := renderEnv(nil)
	if !strings.Contains(body, "Add your environment variables") {
		t.Fatalf("expected placeholder text, got:\n%s", body)
	}
}

func TestBuildEnvLocalWritesFile(t *testing.T) {
	fr := &recordingRunner{}
	step := BuildEnvLocal(Input{ProjectPath: "/p", Runner: fr}, []EnvKey{
		{Section: "Clerk", Key: "CLERK_SECRET_KEY"},
	})
	if err := step.Run(context.Background(), nil); err != nil {
		t.Fatal(err)
	}
	body, ok := fr.files["/p/.env.local"]
	if !ok {
		t.Fatal(".env.local not written")
	}
	if !strings.Contains(string(body), "CLERK_SECRET_KEY=REPLACE_ME") {
		t.Fatalf("expected CLERK key with REPLACE_ME placeholder:\n%s", body)
	}
}
