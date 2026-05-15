package steps

import (
	"context"
	"path/filepath"

	"github.com/mikekenway/create-ekko-app/internal/options"
)

// EnvKey carries metadata for the .env.local aggregator.
type EnvKey struct {
	Section string // e.g., "Clerk", "Drizzle"
	Key     string
	Value   string // placeholder value (or empty)
	Comment string // optional inline comment
}

// Step is the unit of work the install UI consumes.
type Step struct {
	Title   string
	Run     func(ctx context.Context, write func(string)) error
	EnvKeys []EnvKey // contributed to the env aggregator
}

// Input is what every builder receives.
type Input struct {
	Ctx         context.Context
	Cfg         options.Config
	ProjectPath string
	Runner      Runner
}

// Runner is redeclared here (mirroring scaffold.Runner) to break the
// scaffold -> steps -> scaffold import cycle.
type Runner interface {
	Exec(ctx context.Context, dir, name string, args []string, write func(string)) error
	WriteFile(path string, content []byte, mode FileMode) error
	MkdirAll(path string) error
}

// FileMode is io/fs.FileMode aliased to keep this file dependency-light.
type FileMode = uint32

// Join is a tiny helper to keep call sites short.
func Join(elem ...string) string { return filepath.Join(elem...) }
