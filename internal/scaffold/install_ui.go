package scaffold

import (
	"context"
	"fmt"
	"strings"

	"github.com/charmbracelet/bubbles/progress"
	"github.com/charmbracelet/bubbles/viewport"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/muesli/reflow/wordwrap"
)

func runInstallUI(ctx context.Context, steps []installStep) error {
	model := newInstallModel(ctx, steps)
	program := tea.NewProgram(model, tea.WithContext(ctx))

	final, err := program.Run()
	if err != nil {
		return err
	}

	if m, ok := final.(*installModel); ok {
		return m.err
	}

	return nil
}

type installModel struct {
	ctx     context.Context
	steps   []installStep
	current int

	progress progress.Model
	viewport viewport.Model

	logs strings.Builder
	err  error

	width int

	chunks chan string
	done   chan error

	percent      float64
	stepProgress float64
}

func newInstallModel(ctx context.Context, steps []installStep) *installModel {
	pr := progress.New(
		progress.WithGradient("#7c3aed", "#f472b6"),
	)

	vp := viewport.New(0, 0)
	vp.Style = lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(lipgloss.Color("#9d4edd")).
		Padding(1, 2)

	return &installModel{
		ctx:      ctx,
		steps:    steps,
		progress: pr,
		viewport: vp,
	}
}

type stepChunkMsg struct {
	text string
}

type stepFinishedMsg struct {
	err error
}

func (m *installModel) Init() tea.Cmd {
	if len(m.steps) == 0 {
		return nil
	}
	return m.startCurrentStep()
}

func (m *installModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		vpWidth := max(20, msg.Width-4)
		// Use up to half of the available height for the logs viewport, but cap it
		// so it doesn't get excessively tall on very large terminals.
		// A cap of 18 rows is roughly equivalent to ~300px in a typical terminal.
		const maxViewportHeight = 18
		vpHeight := minInt(maxViewportHeight, max(8, (msg.Height/2)-4))
		m.viewport.Width = vpWidth
		m.viewport.Height = vpHeight
		m.progress.Width = vpWidth
		m.viewport.SetContent(m.logs.String())
		m.viewport.GotoBottom()
		return m, nil
	case stepChunkMsg:
		m.appendChunk(msg.text)
		var cmds []tea.Cmd
		if cmd := m.bumpStepProgress(); cmd != nil {
			cmds = append(cmds, cmd)
		}
		cmds = append(cmds, m.waitForActivity())
		return m, tea.Batch(cmds...)
	case stepFinishedMsg:
		m.stepProgress = 1
		m.percent = m.currentPercent()
		progressCmd := m.progress.SetPercent(m.percent)

		if msg.err != nil {
			m.err = msg.err
			return m, tea.Batch(progressCmd, tea.Quit)
		}

		m.current++
		if m.current >= len(m.steps) {
			return m, tea.Batch(progressCmd, tea.Quit)
		}

		return m, tea.Batch(progressCmd, m.startCurrentStep())
	}

	var cmd tea.Cmd
	m.viewport, cmd = m.viewport.Update(msg)
	return m, cmd
}

func (m *installModel) View() string {
	header := lipgloss.NewStyle().
		Foreground(lipgloss.Color("#f4dfff")).
		Bold(true).
		Render("Installing your stack…")

	help := lipgloss.NewStyle().
		Faint(true).
		MarginTop(1).
		Render("ctrl+c to cancel • arrows/pgup/pgdn to scroll logs")

	return lipgloss.JoinVertical(
		lipgloss.Left,
		header,
		m.progress.ViewAs(m.percent),
		m.viewport.View(),
		help,
	)
}

func (m *installModel) appendHeader(title string) {
	if m.logs.Len() > 0 {
		m.logs.WriteString("\n")
	}
	m.writeWrapped(fmt.Sprintf("## %s", title))
}

func (m *installModel) appendChunk(body string) {
	m.writeWrapped(body)
}

func (m *installModel) updateViewport() {
	m.viewport.SetContent(m.logs.String())
	if m.viewport.Width > 0 && m.viewport.Height > 0 {
		m.viewport.GotoBottom()
	}
}

func (m *installModel) writeWrapped(body string) {
	text := body
	width := m.viewport.Width - 4
	if width > 0 {
		text = wordwrap.String(body, width)
	}
	if !strings.HasSuffix(text, "\n") {
		text += "\n"
	}
	m.logs.WriteString(text)
	m.updateViewport()
}

func (m *installModel) startCurrentStep() tea.Cmd {
	step := m.steps[m.current]
	m.appendHeader(step.title)
	m.stepProgress = 0
	m.percent = m.currentPercent()
	progressCmd := m.progress.SetPercent(m.percent)

	m.chunks = make(chan string)
	m.done = make(chan error, 1)

	go func() {
		err := step.run(m.ctx, func(chunk string) {
			select {
			case m.chunks <- chunk:
			case <-m.ctx.Done():
			}
		})
		close(m.chunks)
		m.done <- err
	}()

	return tea.Batch(progressCmd, m.waitForActivity())
}

func (m *installModel) waitForActivity() tea.Cmd {
	return func() tea.Msg {
		select {
		case chunk, ok := <-m.chunks:
			if !ok {
				err := <-m.done
				return stepFinishedMsg{err: err}
			}
			return stepChunkMsg{text: chunk}
		case err := <-m.done:
			return stepFinishedMsg{err: err}
		case <-m.ctx.Done():
			return stepFinishedMsg{err: m.ctx.Err()}
		}
	}
}

func (m *installModel) currentPercent() float64 {
	total := len(m.steps)
	if total == 0 {
		return 1
	}
	if m.stepProgress < 0 {
		m.stepProgress = 0
	}
	if m.stepProgress > 1 {
		m.stepProgress = 1
	}
	return (float64(m.current) + m.stepProgress) / float64(total)
}

func (m *installModel) bumpStepProgress() tea.Cmd {
	if len(m.steps) == 0 {
		return nil
	}
	const (
		chunkStep     = 0.05
		maxDuringStep = 0.9
	)
	if m.stepProgress >= maxDuringStep {
		return nil
	}
	m.stepProgress = minFloat(maxDuringStep, m.stepProgress+chunkStep)
	m.percent = m.currentPercent()
	return m.progress.SetPercent(m.percent)
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func minFloat(a, b float64) float64 {
	if a < b {
		return a
	}
	return b
}
