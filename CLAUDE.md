# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Emoji Spa is a cross-platform emoji picker (desktop via Tauri 2, browser extension for Chrome/Firefox, and static web). The frontend is **vanilla HTML/CSS/JS with zero npm runtime dependencies** — no frameworks. The single main source file is `frontend/app.js` (~2300 lines).

## Commands

| Task | Command |
|------|---------|
| Install deps | `npm install` (first time only) |
| Dev (Tauri desktop) | `make dev` |
| Dev (web only) | `npm run dev:web` |
| Build frontend | `make frontend-build` or `npm run build:web` |
| Build Tauri backend | `make build` |
| Run all tests | `make test` (runs JS + Rust tests) |
| Run JS tests only | `npm test` |
| Run single JS test file | `npx vitest run tests/search-filtering.test.js` |
| Run Rust tests only | `cd src-tauri && cargo test` |
| Rust formatting | `cd src-tauri && cargo fmt` |
| Build browser extension | `npm run build:extension` (or `:chrome` / `:firefox`) |
| Update emoji metadata | `make update-emoji` |
| Release build (container) | `make release` |
| Web container image | `make serve` (builds and runs on localhost:8080) |
| All Make targets | `make help` |

## Architecture

### Frontend (`frontend/`)
- **`app.js`** — All application logic: emoji generation (iterates Unicode codepoints using `\p{Emoji}` regex), search/filtering, usage tracking, theme system, clipboard handling, keyboard navigation, context menus, settings panel. Global state is managed via module-level variables (`emojiUsage`, `pinnedEmojis`, `hiddenEmojis`, `searchState`).
- **`emoji-data.js`** — Base emoji metadata (`{ emoji, name, keywords }`), merged at runtime with optional CLDR overlay.
- **`style.css`** — CSS custom properties for theming (`data-theme` attribute on `<body>`). Dark mode is default.
- **`public/emoji-cldr.json`** — Generated Unicode CLDR names/keywords (via `scripts/generate_emoji_cldr.sh`).
- **`public/emoji-slack.json`** — Generated Slack keyword aliases (via `scripts/generate_slack_emoji_keywords.mjs`).

### Tauri Backend (`src-tauri/`)
- Minimal Rust backend. Single command: `close_app_window`. Entry point: `src-tauri/src/main.rs`.
- `build.rs` validates PNG icon exists for bundling.
- `tauri.conf.json` configures window size (1000x800), bundle targets (deb/rpm/appimage), and icons.

### Tests (`tests/`)
- Vitest + jsdom. Config: `vitest.config.mjs`, setup: `tests/setup-env.js`.
- Setup file creates mock DOM with all required UI elements, mock localStorage (`MemoryStorage`), and mock `matchMedia`.
- Tests import functions from `app.js` and `emoji-data.js` directly.

### Build System
- **Vite** bundles frontend (root: `frontend/`, output: `dist/`).
- **Makefile** orchestrates builds. Sanitizes PATH to avoid Linuxbrew/system linker conflicts on Fedora.
- **Containerfile** — Rust-based image for release builds. **Containerfile.web** — Node builder → nginx for static web.
- **`scripts/build_extension.mjs`** — Builds MV3 browser extension using Vite's `baseConfig` from `vite.config.ts`.

### Infrastructure
- `k8s/prod/deploy.yaml` — Kubernetes deployment manifest.
- `infra/cloudflare/` — Terraform for DNS/CDN.
- `infra/nginx/emoji-spa.conf` — Nginx config with SPA routing and cache headers.

## Coding Conventions

- **No frameworks** — extend existing vanilla JS patterns in `app.js`, don't introduce React/Vue/etc.
- **JS style** — 2-space indentation, `const`/`let` (no `var`), descriptive names consistent with existing code.
- **Rust style** — `rustfmt` defaults, `lower_snake_case` for variables/functions, `UpperCamelCase` for types.
- **Avoid new global state** in the frontend; extend existing helpers.
- **localStorage keys** are versioned (e.g., `emojiUsage.v1`, `emojiThemePreference.v1`).
- **Commit messages** — short, descriptive, imperative mood (e.g., "Fix emoji filter for hidden items").

## Key Implementation Details

- Emoji detection uses Unicode property escapes (`\p{Emoji}`) with a heuristic fallback for environments without support.
- Metadata is two-level: base (`emoji-data.js`) + CLDR overlay (`emoji-cldr.json`). CLDR names override base; keywords are merged.
- Search is multi-token: each word must match at least one field (emoji char, category, name, or keywords).
- Tauri detection: `window.__TAURI__.invoke` check. Clipboard uses `navigator.clipboard.writeText()` with Tauri invoke fallback.
