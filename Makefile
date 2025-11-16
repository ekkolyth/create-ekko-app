.PHONY: go build publish publish.patch publish.minor publish.major publish.current

DRY_RUN ?= 0

# Build the Go CLI binary
build:
	mkdir -p bin
	go build -o bin/create-ekko-app ./cmd/create-ekko-app

go: build
	go run ./cmd/create-ekko-app

# Bump the version in .github/release.json and, for non-dry runs, commit the change,
# create a git tag, and push. Default bump level is "patch".
publish: publish.patch

publish.patch:
	$(MAKE) _publish LEVEL=patch

publish.minor:
	$(MAKE) _publish LEVEL=minor

publish.major:
	$(MAKE) _publish LEVEL=major

# Publish the current version from .github/release.json without bumping it.
# For non-dry runs, creates a git tag and pushes to origin.
publish.current:
	@if [ "$$(git status --porcelain)" != "" ]; then \
		echo "Working tree is not clean. Commit or stash changes before publishing."; \
		exit 1; \
	fi
	@if [ "$(DRY_RUN)" = "1" ]; then \
		CURRENT_VERSION=$$(go run ./cmd/release-version); \
		echo "DRY RUN: current version is $$CURRENT_VERSION"; \
		echo "DRY RUN: would create tag v$$CURRENT_VERSION and push to origin"; \
	else \
		CURRENT_VERSION=$$(go run ./cmd/release-version); \
		echo "Publishing current version $$CURRENT_VERSION"; \
		git tag -a "v$$CURRENT_VERSION" -m "Release v$$CURRENT_VERSION"; \
		git push origin HEAD; \
		git push origin "v$$CURRENT_VERSION"; \
	fi

_publish:
	@if [ "$$(git status --porcelain)" != "" ]; then \
		echo "Working tree is not clean. Commit or stash changes before publishing."; \
		exit 1; \
	fi
	@if [ "$(DRY_RUN)" = "1" ]; then \
		NEXT_VERSION=$$(go run ./cmd/release-bump -level=$(LEVEL) -dry-run); \
		echo "DRY RUN: next version would be $$NEXT_VERSION"; \
		echo "DRY RUN: would create tag v$$NEXT_VERSION and push to origin"; \
	else \
		NEXT_VERSION=$$(go run ./cmd/release-bump -level=$(LEVEL)); \
		echo "Bumped version to $$NEXT_VERSION"; \
		git add .github/release.json; \
		git commit -m "chore: release v$$NEXT_VERSION"; \
		git tag -a "v$$NEXT_VERSION" -m "Release v$$NEXT_VERSION"; \
		git push origin HEAD; \
		git push origin "v$$NEXT_VERSION"; \
	fi
