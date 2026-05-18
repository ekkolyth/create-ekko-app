package steps

import (
	"context"
	"testing"
)

func TestBuildZod(t *testing.T) {
	fr := &recordingRunner{}
	step := BuildZod(Input{ProjectPath: "/p", Runner: fr})
	if err := step.Run(context.Background(), nil); err != nil {
		t.Fatal(err)
	}
	if len(fr.execs) != 1 || fr.execs[0].args[1] != "zod" {
		t.Fatalf("unexpected execs: %v", fr.execs)
	}
}
