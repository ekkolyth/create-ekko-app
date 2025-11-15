.PHONY: go build

build:
	mkdir -p bin
	go build -o bin/create-ekko-app ./cmd/create-ekko-app

go: build
	go run ./cmd/create-ekko-app

