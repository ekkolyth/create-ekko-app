package steps

import (
	"context"
	"strings"
	"testing"

	"github.com/mikekenway/create-ekko-app/internal/options"
)

func TestBuildDrizzleWritesAllFiles(t *testing.T) {
	fr := &recordingRunner{}
	step := BuildDrizzle(Input{
		ProjectPath: "/p",
		Cfg:         options.Config{ProjectName: "demo"},
		Runner:      fr,
	})
	if err := step.Run(context.Background(), nil); err != nil {
		t.Fatal(err)
	}
	for _, p := range []string{
		"/p/drizzle.config.ts",
		"/p/src/db/index.ts",
		"/p/src/db/schema.ts",
		"/p/docker-compose.yml",
	} {
		if _, ok := fr.files[p]; !ok {
			t.Fatalf("missing %s", p)
		}
	}
	compose := string(fr.files["/p/docker-compose.yml"])
	if !strings.Contains(compose, "POSTGRES_DB: demo") {
		t.Fatal("compose missing db name")
	}
	if len(step.EnvKeys) != 1 || step.EnvKeys[0].Key != "DATABASE_URL" {
		t.Fatalf("env keys wrong: %v", step.EnvKeys)
	}
}
