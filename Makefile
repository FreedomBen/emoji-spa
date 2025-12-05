SHELL := /bin/bash
CONTAINER_TOOL ?= $(shell if command -v podman >/dev/null 2>&1; then echo podman; else echo docker; fi)
CONTAINER_IMAGE ?= emoji-spa:web

.PHONY: all build run install-tauri dev update-emoji build-release test clean web-image serve frontend-build extension extension-pack install-release-rpm

all: build

build: frontend-build
	@echo "Tip: to refresh emoji names from Unicode, periodically run 'make update-emoji'." >&2
	cd src-tauri && \
		cargo update && \
		cargo build

release: frontend-build
	./build_in_container.sh

run: build
	cd src-tauri && \
		cargo install tauri-cli && \
		cargo tauri dev

install-tauri:
	cargo install tauri-cli

dev:
	$(MAKE) frontend-build
	cd src-tauri && \
		cargo tauri dev

update-emoji:
	bash scripts/generate_emoji_cldr.sh
	node scripts/generate_slack_emoji_keywords.mjs

test:
	@echo "Running JavaScript tests with Vitest..." >&2
	npm test
	@echo "Running Rust tests in src-tauri with sanitized PATH (no linuxbrew)..." >&2
	cd src-tauri && \
		SANITIZED_PATH="$$(printf '%s\n' \"$$PATH\" | tr ':' '\n' | grep -v 'linuxbrew' | paste -sd: -)" && \
		PATH="$$SANITIZED_PATH" cargo test

clean:
	rm -rf build-artifacts dist extension-dist target
	cd src-tauri && cargo clean

web-image:
	$(CONTAINER_TOOL) build -f Containerfile.web -t $(CONTAINER_IMAGE) .

serve: web-image
	$(CONTAINER_TOOL) run --rm -p 8080:80 $(CONTAINER_IMAGE)

frontend-build:
	npm run build:web

extension:
	npm run build:extension

extension-pack: extension
	@echo "Packaging Chrome extension..." >&2
	cd extension-dist && rm -f chrome.zip && zip -qr chrome.zip chrome
	@echo "Packaging Firefox extension..." >&2
	cd extension-dist && rm -f firefox.zip && zip -qr firefox.zip firefox

install-release-rpm: release
	@set -euo pipefail; \
	RPM_DIR="build-artifacts/bundle/rpm"; \
	latest_rpm="$$(ls -1t "$${RPM_DIR}"/*.rpm 2>/dev/null | head -n1)"; \
	if [[ -z "$${latest_rpm}" ]]; then \
		echo "No RPM found in $${RPM_DIR}. Run 'make release' first." >&2; \
		exit 1; \
	fi; \
	echo "Installing $${latest_rpm}..."; \
	sudo dnf install "$${latest_rpm}"
