package templates

import (
	"bytes"
	"embed"
	"fmt"
	"io/fs"
	"text/template"
)

//go:embed all:next all:tanstack all:common
var files embed.FS

// FS exposes the underlying embedded filesystem.
func FS() fs.FS { return files }

// Render parses the named template and executes it against data.
// Name is a path relative to the embed root (e.g., "common/biome.json.tmpl").
func Render(name string, data any) ([]byte, error) {
	raw, err := files.ReadFile(name)
	if err != nil {
		return nil, fmt.Errorf("read template %s: %w", name, err)
	}
	tmpl, err := template.New(name).Option("missingkey=error").Parse(string(raw))
	if err != nil {
		return nil, fmt.Errorf("parse template %s: %w", name, err)
	}
	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, data); err != nil {
		return nil, fmt.Errorf("execute template %s: %w", name, err)
	}
	return buf.Bytes(), nil
}
