package options

// Framework identifies the target application scaffold.
type Framework string

const (
	FrameworkNext          Framework = "next"
	FrameworkTanstackStart Framework = "tanstack-start"
)

// AuthChoice enumerates authentication packages.
type AuthChoice string

const (
	AuthNone       AuthChoice = "none"
	AuthClerk      AuthChoice = "clerk"
	AuthBetterAuth AuthChoice = "better-auth"
)

// DatabaseChoice enumerates supported persistence layers.
type DatabaseChoice string

const (
	DatabaseNone    DatabaseChoice = "none"
	DatabaseConvex  DatabaseChoice = "convex"
	DatabaseDrizzle DatabaseChoice = "drizzle"
)

// ToolingOption captures optional integrations.
type ToolingOption string

const (
	ToolShadcn        ToolingOption = "shadcn"
	ToolTanstackQuery ToolingOption = "tanstack-query"
	ToolTanstackForm  ToolingOption = "tanstack-form"
	ToolReactEmail    ToolingOption = "react-email"
	ToolResend        ToolingOption = "resend"
	ToolBiome         ToolingOption = "biome"
	ToolZod           ToolingOption = "zod"
)

// Config mirrors the interactive selections made by the user.
type Config struct {
	ProjectName string
	Framework   Framework
	Auth        AuthChoice
	Database    DatabaseChoice
	Tooling     []ToolingOption
	ShadcnColor string
}

// Normalize applies cross-field rules. Better Auth requires Drizzle.
// Default shadcn color is zinc.
func (c *Config) Normalize() {
	if c.Auth == AuthBetterAuth && c.Database != DatabaseDrizzle {
		c.Database = DatabaseDrizzle
	}
	if c.ShadcnColor == "" {
		c.ShadcnColor = "zinc"
	}
}

// HasTool reports whether the given tool is selected.
func (c *Config) HasTool(t ToolingOption) bool {
	for _, x := range c.Tooling {
		if x == t {
			return true
		}
	}
	return false
}
