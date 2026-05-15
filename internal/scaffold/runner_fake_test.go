package scaffold

import (
	"context"
	"errors"
	"io/fs"
	"sync"
	"time"
)

type fakeExec struct {
	Dir  string
	Name string
	Args []string
}

type fakeFile struct {
	Content []byte
	Mode    fs.FileMode
}

type fakeRunner struct {
	mu       sync.Mutex
	execs    []fakeExec
	files    map[string]fakeFile
	mkdirs   []string
	execErrs map[string]error
}

func newFakeRunner() *fakeRunner {
	return &fakeRunner{
		files:    map[string]fakeFile{},
		execErrs: map[string]error{},
	}
}

func (r *fakeRunner) Exec(_ context.Context, dir, name string, args []string, _ func(string)) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.execs = append(r.execs, fakeExec{Dir: dir, Name: name, Args: append([]string(nil), args...)})
	key := name
	if len(args) > 0 {
		key = name + " " + args[0]
	}
	if err, ok := r.execErrs[key]; ok {
		return err
	}
	return nil
}

func (r *fakeRunner) WriteFile(path string, content []byte, mode fs.FileMode) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.files[path] = fakeFile{Content: append([]byte(nil), content...), Mode: mode}
	return nil
}

func (r *fakeRunner) MkdirAll(path string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.mkdirs = append(r.mkdirs, path)
	return nil
}

func (r *fakeRunner) RemoveAll(_ string) error { return nil }

func (r *fakeRunner) Stat(path string) (fs.FileInfo, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, ok := r.files[path]; ok {
		return fakeInfo{name: path}, nil
	}
	return nil, errors.New("not exist")
}

type fakeInfo struct{ name string }

func (f fakeInfo) Name() string       { return f.name }
func (f fakeInfo) Size() int64        { return 0 }
func (f fakeInfo) Mode() fs.FileMode  { return 0 }
func (f fakeInfo) ModTime() time.Time { return time.Time{} }
func (f fakeInfo) IsDir() bool        { return false }
func (f fakeInfo) Sys() any           { return nil }
