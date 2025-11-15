package ui

import (
	"context"
	"errors"
	"fmt"
	"math"
	"os"
	"strings"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/harmonica"
	"github.com/charmbracelet/huh"
	"github.com/charmbracelet/lipgloss"

	"github.com/mikekenway/create-ekko-app/internal/options"
)

// ErrAborted signals that the user cancelled out of the interactive flow.
var ErrAborted = errors.New("setup cancelled by user")

// Run gathers configuration via Charm-based prompts and returns the user's selections.
func Run(ctx context.Context, initial options.Config) (options.Config, error) {
	cfg, err := runForm(ctx, initial)
	if err != nil {
		if errors.Is(err, huh.ErrUserAborted) || errors.Is(err, context.Canceled) || errors.Is(err, tea.ErrInterrupted) {
			return options.Config{}, ErrAborted
		}
		return options.Config{}, err
	}

	if err := runSummary(ctx, cfg); err != nil {
		if errors.Is(err, ErrAborted) || errors.Is(err, tea.ErrInterrupted) || errors.Is(err, context.Canceled) {
			return options.Config{}, ErrAborted
		}
		return options.Config{}, err
	}

	return cfg, nil
}

func runForm(ctx context.Context, initial options.Config) (options.Config, error) {
	projectName := defaultString(strings.TrimSpace(initial.ProjectName), "ekko-app")
	frameworkVal := defaultString(string(initial.Framework), string(options.FrameworkNext))
	authVal := defaultString(string(initial.Auth), string(options.AuthNone))
	dbVal := defaultString(string(initial.Database), string(options.DatabaseNone))
	toolSelections := make([]string, len(initial.Tooling))
	for i, tool := range initial.Tooling {
		toolSelections[i] = string(tool)
	}
	shadcnColor := defaultString(initial.ShadcnColor, "zinc")

	form := huh.NewForm(
		huh.NewGroup(
			huh.NewInput().
				Title("What is your project called?").
				Placeholder("ekko-app").
				Value(&projectName).
				Validate(func(value string) error {
					if strings.TrimSpace(value) == "" {
						return fmt.Errorf("please enter a project name")
					}
					return nil
				}),
		).WithHideFunc(func() bool {
			return projectName != "" && initial.ProjectName != ""
		}),
		huh.NewGroup(
			huh.NewSelect[string]().
				Title("Choose your framework").
				Options(
					huh.NewOption("Next.js", string(options.FrameworkNext)),
					huh.NewOption("TanStack Start", string(options.FrameworkTanstackStart)),
				).
				Value(&frameworkVal),
		),
		huh.NewGroup(
			huh.NewSelect[string]().
				Title("Choose your auth package").
				Options(
					huh.NewOption("None", string(options.AuthNone)),
					huh.NewOption("Clerk", string(options.AuthClerk)),
					huh.NewOption("Better Auth", string(options.AuthBetterAuth)),
				).
				Value(&authVal),
		),
		huh.NewGroup(
			huh.NewSelect[string]().
				Title("Choose your database").
				Options(
					huh.NewOption("None", string(options.DatabaseNone)),
					huh.NewOption("Convex", string(options.DatabaseConvex)),
					huh.NewOption("Drizzle", string(options.DatabaseDrizzle)),
				).
				Value(&dbVal),
		),
		huh.NewGroup(
			huh.NewMultiSelect[string]().
				Title("Choose your tooling").
				Options(
					huh.NewOption("TanStack Query", string(options.ToolTanstackQuery)),
					huh.NewOption("TanStack Form", string(options.ToolTanstackForm)),
					huh.NewOption("shadcn", string(options.ToolShadcn)),
					huh.NewOption("React Email", string(options.ToolReactEmail)),
					huh.NewOption("Resend", string(options.ToolResend)),
				).
				Value(&toolSelections),
		),
		huh.NewGroup(
			huh.NewSelect[string]().
				Title("What base color would you like for shadcn?").
				Options(
					huh.NewOption("Neutral", "neutral"),
					huh.NewOption("Gray", "gray"),
					huh.NewOption("Zinc", "zinc"),
					huh.NewOption("Stone", "stone"),
					huh.NewOption("Slate", "slate"),
				).
				Value(&shadcnColor),
		).WithHideFunc(func() bool {
			return !contains(toolSelections, string(options.ToolShadcn))
		}),
	).
		WithShowHelp(true).
		WithShowErrors(true).
		WithTheme(huh.ThemeCharm())

	if err := form.RunWithContext(ctx); err != nil {
		return options.Config{}, err
	}

	cfg := options.Config{
		ProjectName: strings.TrimSpace(projectName),
		Framework:   options.Framework(frameworkVal),
		Auth:        options.AuthChoice(authVal),
		Database:    options.DatabaseChoice(dbVal),
		Tooling:     toToolingOptions(toolSelections),
	}

	if contains(toolSelections, string(options.ToolShadcn)) {
		cfg.ShadcnColor = shadcnColor
	}

	return cfg, nil
}

func runSummary(ctx context.Context, cfg options.Config) error {
	items := buildSummaryItems(cfg)
	model := newSummaryModel(items)

	program := tea.NewProgram(
		model,
		tea.WithContext(ctx),
		tea.WithOutput(os.Stderr),
	)

	final, err := program.Run()
	if err != nil {
		if errors.Is(err, tea.ErrInterrupted) {
			return ErrAborted
		}
		return err
	}

	if m, ok := final.(*summaryModel); ok {
		if !m.confirmed {
			return ErrAborted
		}
	}

	return nil
}

func buildSummaryItems(cfg options.Config) []string {
	items := []string{
		cfg.ProjectName,
		describeFramework(cfg.Framework),
	}

	if cfg.Auth != options.AuthNone {
		items = append(items, describeAuth(cfg.Auth))
	}

	if cfg.Database != options.DatabaseNone {
		items = append(items, describeDatabase(cfg.Database))
	}

	for _, tool := range cfg.Tooling {
		switch tool {
		case options.ToolShadcn:
			label := "shadcn"
			if cfg.ShadcnColor != "" {
				label = fmt.Sprintf("shadcn (%s)", cfg.ShadcnColor)
			}
			items = append(items, label)
		case options.ToolReactEmail:
			items = append(items, "React Email")
		case options.ToolResend:
			items = append(items, "Resend")
		case options.ToolTanstackQuery:
			items = append(items, "TanStack Query")
		case options.ToolTanstackForm:
			items = append(items, "TanStack Form")
		}
	}

	return items
}

func describeFramework(f options.Framework) string {
	switch f {
	case options.FrameworkTanstackStart:
		return "TanStack Start"
	default:
		return "Next.js"
	}
}

func describeAuth(a options.AuthChoice) string {
	switch a {
	case options.AuthClerk:
		return "Clerk"
	case options.AuthBetterAuth:
		return "Better Auth"
	default:
		return "None"
	}
}

func describeDatabase(db options.DatabaseChoice) string {
	switch db {
	case options.DatabaseConvex:
		return "Convex"
	case options.DatabaseDrizzle:
		return "Drizzle"
	default:
		return "None"
	}
}

func defaultString(value, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return value
}

func toToolingOptions(values []string) []options.ToolingOption {
	out := make([]options.ToolingOption, 0, len(values))
	for _, v := range values {
		out = append(out, options.ToolingOption(v))
	}
	return out
}

func contains(values []string, target string) bool {
	for _, v := range values {
		if v == target {
			return true
		}
	}
	return false
}

type summaryModel struct {
	items        []string
	confirmed    bool
	width        int
	height       int
	animSpring   harmonica.Spring
	animPos      float64
	animVelocity float64
	animTarget   float64
	animating    bool

	headerStyle lipgloss.Style
	cardStyle   lipgloss.Style
	itemStyle   lipgloss.Style
	helpStyle   lipgloss.Style
}

func newSummaryModel(items []string) *summaryModel {
	return &summaryModel{
		items:      items,
		animSpring: harmonica.NewSpring(harmonica.FPS(60), 5.0, 0.25),
		animTarget: 1.0,
		animating:  true,
		headerStyle: lipgloss.NewStyle().
			Foreground(lipgloss.Color("#f4dfff")).
			Bold(true).
			PaddingBottom(1),
		cardStyle: lipgloss.NewStyle().
			BorderStyle(lipgloss.RoundedBorder()).
			BorderForeground(lipgloss.Color("#9d4edd")).
			Padding(1, 2).
			Width(50),
		itemStyle: lipgloss.NewStyle().
			Foreground(lipgloss.Color("#f8edff")).
			PaddingLeft(1).
			MarginBottom(0),
		helpStyle: lipgloss.NewStyle().
			Faint(true).
			MarginTop(1),
	}
}

type springMsg struct{}

func tickSpring() tea.Cmd {
	return tea.Tick(time.Millisecond*32, func(time.Time) tea.Msg {
		return springMsg{}
	})
}

func (m *summaryModel) Init() tea.Cmd {
	if m.animating {
		return tickSpring()
	}
	return nil
}

func (m *summaryModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		return m, nil
	case tea.KeyMsg:
		switch msg.String() {
		case "enter":
			m.confirmed = true
			return m, tea.Quit
		case "q", "esc", "ctrl+c":
			return m, tea.Quit
		}
	case springMsg:
		if !m.animating {
			return m, nil
		}
		m.animPos, m.animVelocity = m.animSpring.Update(m.animPos, m.animVelocity, m.animTarget)
		if math.Abs(m.animPos-m.animTarget) < 0.02 {
			m.animPos = m.animTarget
			m.animating = false
			return m, nil
		}
		return m, tickSpring()
	}

	return m, nil
}

func (m *summaryModel) View() string {
	header := m.headerStyle.Render("📋 Summary")

	indent := 2 + int(4*m.animPos)
	colorIdx := int(m.animPos * float64(len(pulsePalette)-1))
	if colorIdx < 0 {
		colorIdx = 0
	}
	if colorIdx >= len(pulsePalette) {
		colorIdx = len(pulsePalette) - 1
	}
	bulletColor := lipgloss.Color(pulsePalette[colorIdx])
	bulletStyle := lipgloss.NewStyle().Foreground(bulletColor)

	var rows []string
	for _, item := range m.items {
		bullet := bulletStyle.Render("●")
		line := fmt.Sprintf("%s%s %s", strings.Repeat(" ", indent), bullet, m.itemStyle.Render(item))
		rows = append(rows, line)
	}

	listView := strings.Join(rows, "\n")

	body := lipgloss.JoinVertical(
		lipgloss.Left,
		header,
		m.cardStyle.Render(listView),
		m.helpStyle.Render("enter to continue • q to cancel"),
	)

	return lipgloss.PlaceHorizontal(m.width, lipgloss.Center, body)
}

var pulsePalette = []string{
	"#c77dff",
	"#e0aaff",
	"#ffafcc",
	"#ffd6ff",
	"#bde0fe",
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
