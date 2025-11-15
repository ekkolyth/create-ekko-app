package main

import (
	"context"
	"errors"
	"flag"
	"os"
	"os/signal"
	"syscall"

	"github.com/charmbracelet/log"

	"github.com/mikekenway/create-ekko-app/internal/options"
	"github.com/mikekenway/create-ekko-app/internal/scaffold"
	"github.com/mikekenway/create-ekko-app/internal/ui"
)

var version = "dev"

func main() {
	flagVersion := flag.Bool("version", false, "print version and exit")
	flag.Parse()

	if *flagVersion {
		log.Infof("create-ekko-app %s", version)
		return
	}

	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()

	logger := log.New(os.Stderr)
	logger.SetPrefix("create-ekko-app")

	initial := options.Config{
		Framework: options.FrameworkNext,
		Auth:      options.AuthNone,
		Database:  options.DatabaseNone,
		Tooling:   []options.ToolingOption{},
	}

	if arg := flag.Arg(0); arg != "" {
		initial.ProjectName = arg
	}

	selection, err := ui.Run(ctx, initial)
	if err != nil {
		if errors.Is(err, ui.ErrAborted) {
			logger.Info("setup cancelled")
			return
		}
		logger.Fatal("interactive setup failed", "err", err)
	}

	if err := scaffold.Run(ctx, selection, logger); err != nil {
		logger.Fatal("scaffold failed", "err", err)
	}

	logger.Info("done")
}
