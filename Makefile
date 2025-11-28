SHELL := /bin/bash
CONTAINER_TOOL ?= $(shell if command -v podman >/dev/null 2>&1; then echo podman; else echo docker; fi)
CONTAINER_IMAGE ?= emoji-spa:web

.PHONY: all build run install-tauri dev update-emoji build-release test clean web-image serve

all: build

build:
	@echo "Tip: to refresh emoji names from Unicode, periodically run 'make update-emoji'." >&2
	cd src-tauri && \
		cargo update && \
		cargo build

release:
	./build_in_container.sh

run: build
	cd src-tauri && \
		cargo install tauri-cli && \
		cargo tauri dev

install-tauri:
	cargo install tauri-cli

dev:
	cd src-tauri && \
		cargo tauri dev

update-emoji:
	bash scripts/generate_emoji_cldr.sh

test:
	@echo "Running JavaScript tests with Vitest..." >&2
	npm test
	@echo "Running Rust tests in src-tauri with sanitized PATH (no linuxbrew)..." >&2
	cd src-tauri && \
		SANITIZED_PATH="$$(printf '%s\n' \"$$PATH\" | tr ':' '\n' | grep -v 'linuxbrew' | paste -sd: -)" && \
		PATH="$$SANITIZED_PATH" cargo test

clean:
	rm -rf build-artifacts target
	cd src-tauri && cargo clean

web-image:
	$(CONTAINER_TOOL) build -f Containerfile -t $(CONTAINER_IMAGE) .

serve: web-image
	$(CONTAINER_TOOL) run --rm -p 8080:80 $(CONTAINER_IMAGE)
