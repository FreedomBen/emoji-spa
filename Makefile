SHELL := /bin/bash

.PHONY: all run build install-tauri dev

all: run

run:
	cd src-tauri && \
		cargo update && \
		cargo build && \
		cargo install tauri-cli && \
		cargo tauri dev

build:
	cd src-tauri && \
		cargo update && \
		cargo build

install-tauri:
	cargo install tauri-cli

dev:
	cd src-tauri && \
		cargo tauri dev

