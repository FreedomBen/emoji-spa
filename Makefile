SHELL := /bin/bash
CONTAINER_TOOL ?= $(shell if command -v podman >/dev/null 2>&1; then echo podman; else echo docker; fi)
CONTAINER_IMAGE ?= emoji-spa:web
CONTAINER_PUBLISH ?= -p 8080:80

.PHONY: all build run install-tauri dev update-emoji build-release test test-e2e clean web-image serve frontend-build extension extension-pack install-release-rpm help

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

test-e2e:
	@echo "Running Playwright E2E tests..." >&2
	npm run test:e2e

clean:
	rm -rf build-artifacts dist extension-dist target
	cd src-tauri && cargo clean

web-image:
	$(CONTAINER_TOOL) build -f Containerfile.web -t $(CONTAINER_IMAGE) .

serve: web-image
	$(CONTAINER_TOOL) run --rm $(CONTAINER_PUBLISH) $(CONTAINER_IMAGE)

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

help:
	@printf "Available targets:\n"
	@printf "  %-22s %s\n" "all" "Default; runs 'build'."
	@printf "  %-22s %s\n" "build" "Build frontend then Tauri backend (cargo build)."
	@printf "  %-22s %s\n" "release" "Create release bundle inside container (build_in_container.sh)."
	@printf "  %-22s %s\n" "run" "Build and start Tauri dev app (installs tauri-cli if needed)."
	@printf "  %-22s %s\n" "install-tauri" "Install the Tauri CLI globally."
	@printf "  %-22s %s\n" "dev" "Build frontend and run cargo tauri dev."
	@printf "  %-22s %s\n" "update-emoji" "Regenerate emoji metadata JSON from CLDR + Slack keywords."
	@printf "  %-22s %s\n" "test" "Run Vitest for JS then cargo test in src-tauri with sanitized PATH."
	@printf "  %-22s %s\n" "test-e2e" "Run Playwright E2E tests against the dev server."
	@printf "  %-22s %s\n" "clean" "Remove build artifacts, dist outputs, and target dirs."
	@printf "  %-22s %s\n" "web-image" "Build static web container image using Containerfile.web."
	@printf "  %-22s %s\n" "serve" "Run web image locally on port 8080 (IPv6 localhost by default)."
	@printf "  %-22s %s\n" "frontend-build" "Bundle the web frontend (npm run build:web)."
	@printf "  %-22s %s\n" "extension" "Build browser extension bundle (npm run build:extension)."
	@printf "  %-22s %s\n" "extension-pack" "Zip Chrome and Firefox extension bundles under extension-dist/."
	@printf "  %-22s %s\n" "install-release-rpm" "Install the latest built RPM from build-artifacts/bundle/rpm."
