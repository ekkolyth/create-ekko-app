package scaffold

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"io/fs"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"

	"github.com/mikekenway/create-ekko-app/internal/scaffold/steps"
)

// Runner abstracts side effects so step builders are testable.
type Runner interface {
	Exec(ctx context.Context, dir string, name string, args []string, write func(string)) error
	WriteFile(path string, content []byte, mode fs.FileMode) error
	MkdirAll(path string) error
	RemoveAll(path string) error
	Stat(path string) (fs.FileInfo, error)
}

type execRunner struct{}

// NewRunner returns a Runner that performs real side effects.
func NewRunner() Runner { return &execRunner{} }

func (r *execRunner) Exec(ctx context.Context, dir, name string, args []string, write func(string)) error {
	cmd := exec.CommandContext(ctx, name, args...)
	if dir != "" {
		cmd.Dir = dir
	}
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return err
	}
	stderr, err := cmd.StderrPipe()
	if err != nil {
		return err
	}
	cmd.Stdin = os.Stdin

	if write != nil {
		write(fmt.Sprintf("$ %s %s\n", name, strings.Join(args, " ")))
	}

	if err := cmd.Start(); err != nil {
		return fmt.Errorf("start %s: %w", name, err)
	}

	var wg sync.WaitGroup
	copyPipe := func(reader io.Reader) {
		defer wg.Done()
		scanner := bufio.NewScanner(reader)
		for scanner.Scan() {
			if write != nil {
				write(scanner.Text() + "\n")
			}
		}
	}
	wg.Add(2)
	go copyPipe(stdout)
	go copyPipe(stderr)
	wg.Wait()

	if err := cmd.Wait(); err != nil {
		return fmt.Errorf("run %s %s: %w", name, strings.Join(args, " "), err)
	}
	return nil
}

func (r *execRunner) WriteFile(path string, content []byte, mode fs.FileMode) error {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	return os.WriteFile(path, content, mode)
}

func (r *execRunner) MkdirAll(path string) error           { return os.MkdirAll(path, 0o755) }
func (r *execRunner) RemoveAll(path string) error          { return os.RemoveAll(path) }
func (r *execRunner) Stat(path string) (fs.FileInfo, error) { return os.Stat(path) }


// stepsAdapter wraps a scaffold.Runner so step builders (which see steps.Runner) can use it.
type stepsAdapter struct{ inner Runner }

// adaptForSteps wraps a scaffold.Runner as a steps.Runner.
func adaptForSteps(r Runner) steps.Runner { return &stepsAdapter{inner: r} }

func (s *stepsAdapter) Exec(ctx context.Context, dir, name string, args []string, write func(string)) error {
	return s.inner.Exec(ctx, dir, name, args, write)
}

func (s *stepsAdapter) WriteFile(path string, content []byte, mode steps.FileMode) error {
	return s.inner.WriteFile(path, content, fs.FileMode(mode))
}

func (s *stepsAdapter) MkdirAll(path string) error { return s.inner.MkdirAll(path) }
