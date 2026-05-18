package steps

import (
	"context"
	"fmt"
	"sort"
	"strings"
)

// BuildEnvLocal returns a step that writes .env.local merging all keys from
// every selected option. Pass the collected EnvKeys (typically the union of
// EnvKeys from every other Step in the plan).
func BuildEnvLocal(in Input, keys []EnvKey) Step {
	return Step{
		Title: "Write .env.local",
		Run: func(ctx context.Context, write func(string)) error {
			body := renderEnv(keys)
			return in.Runner.WriteFile(Join(in.ProjectPath, ".env.local"), []byte(body), 0o600)
		},
	}
}

func renderEnv(keys []EnvKey) string {
	if len(keys) == 0 {
		return "# Add your environment variables here\n"
	}

	bySection := map[string][]EnvKey{}
	for _, k := range keys {
		bySection[k.Section] = append(bySection[k.Section], k)
	}
	sections := make([]string, 0, len(bySection))
	for s := range bySection {
		sections = append(sections, s)
	}
	sort.Strings(sections)

	var b strings.Builder
	for i, sec := range sections {
		if i > 0 {
			b.WriteString("\n")
		}
		fmt.Fprintf(&b, "# %s\n", sec)
		for _, k := range bySection[sec] {
			val := k.Value
			if val == "" {
				val = "REPLACE_ME"
			}
			fmt.Fprintf(&b, "%s=%s", k.Key, val)
			if k.Comment != "" {
				fmt.Fprintf(&b, " # %s", k.Comment)
			}
			b.WriteString("\n")
		}
	}
	return b.String()
}
