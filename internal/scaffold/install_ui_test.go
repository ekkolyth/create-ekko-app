package scaffold

import (
	"context"
	"testing"
)

func TestRecalcPercent(t *testing.T) {
	noop := func(_ context.Context, _ func(string)) error { return nil }
	m := newInstallModel(context.Background(), []installStep{
		{title: "a", run: noop},
		{title: "b", run: noop},
	})
	if m.percent != 0 {
		t.Fatalf("start should be 0, got %v", m.percent)
	}
	m.current = 1
	m.recalcPercent()
	if m.percent != 0.5 {
		t.Fatalf("want 0.5, got %v", m.percent)
	}
	m.current = 2
	m.recalcPercent()
	if m.percent != 1.0 {
		t.Fatalf("want 1.0, got %v", m.percent)
	}
}

func TestRecalcPercentEmpty(t *testing.T) {
	m := newInstallModel(context.Background(), nil)
	m.recalcPercent()
	if m.percent != 1 {
		t.Fatalf("empty plan should report 1.0, got %v", m.percent)
	}
}
