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
	ToolTanstackQuery ToolingOption = "tanstack-query"
	ToolTanstackForm  ToolingOption = "tanstack-form"
	ToolShadcn        ToolingOption = "shadcn"
	ToolReactEmail    ToolingOption = "react-email"
	ToolResend        ToolingOption = "resend"
)

// Config mirrors the interactive selections made by the user.
type Config struct {
	ProjectName   string
	Framework     Framework
	Auth          AuthChoice
	Database      DatabaseChoice
	Tooling       []ToolingOption
	ShadcnColor   string
	SkipShadcnOps bool
}
