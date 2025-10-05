.PHONY: build build-all clean

BIN_DIR := bin
DIST_DIR := dist
BINARY := create-ekko-app
SRC := ./cmd/create-ekko-app

build:
	@mkdir -p $(BIN_DIR)
	CGO_ENABLED=0 GO111MODULE=on go build -o $(BIN_DIR)/$(BINARY) $(SRC)

# Build common OS/ARCH combos into dist/<os>-<arch>/
PLATFORMS := linux-amd64 linux-arm64 darwin-amd64 darwin-arm64 windows-amd64 windows-arm64
build-all:
	@mkdir -p $(DIST_DIR)
	@for plat in $(PLATFORMS); do \
		os=$${plat%-*}; arch=$${plat#*-}; \
		out=$(DIST_DIR)/$$plat/$(BINARY); \
		if [ $$os = windows ]; then out=$$out.exe; fi; \
		mkdir -p $(DIST_DIR)/$$plat; \
		CGO_ENABLED=0 GOOS=$$os GOARCH=$$arch GO111MODULE=on go build -o $$out $(SRC); \
	done

clean:
	rm -rf $(BIN_DIR) $(DIST_DIR)
