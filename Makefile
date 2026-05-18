.PHONY: build go

REPO := $(abspath $(CURDIR))

build:
	mkdir -p bin
	go build -o bin/create-ekko-app ./cmd/create-ekko-app

# Usage:
#   make go                  # run binary in this repo dir
#   make go /path/to/dir     # cd there first, then run
go: build
	@DIR="$(filter-out $@,$(MAKECMDGOALS))"; \
	  if [ -z "$$DIR" ]; then \
	    $(REPO)/bin/create-ekko-app; \
	  else \
	    cd "$$DIR" && $(REPO)/bin/create-ekko-app; \
	  fi

# no-op so path arg passed to `make go <path>` doesn't error
%:
	@:
