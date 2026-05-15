package steps

import "context"

type recordedExec struct {
	dir, name string
	args      []string
}

type recordingRunner struct {
	execs []recordedExec
	files map[string][]byte
}

func (r *recordingRunner) Exec(_ context.Context, dir, name string, args []string, _ func(string)) error {
	r.execs = append(r.execs, recordedExec{dir: dir, name: name, args: append([]string(nil), args...)})
	return nil
}

func (r *recordingRunner) WriteFile(path string, content []byte, _ FileMode) error {
	if r.files == nil {
		r.files = map[string][]byte{}
	}
	r.files[path] = append([]byte(nil), content...)
	return nil
}

func (r *recordingRunner) MkdirAll(_ string) error { return nil }

func stringSliceEq(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}
