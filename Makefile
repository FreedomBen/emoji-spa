SHELL := /bin/bash

.PHONY: all build run install-tauri dev

all: build

build:
	cd src-tauri && \
		cargo update && \
		cargo build

run: build
	cd src-tauri && \
		cargo install tauri-cli && \
		cargo tauri dev

install-tauri:
	cargo install tauri-cli

dev:
	cd src-tauri && \
		cargo tauri dev
