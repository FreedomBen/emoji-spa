# Repository Guidelines

## Project Structure & Module Organization
- `src-tauri/` — Rust/Tauri application code and configuration; main entry is `src-tauri/src/main.rs`.
- `dist/` — Static frontend (HTML/CSS/JS) loaded by Tauri, including `app.js` and emoji metadata.
- `scripts/` — Maintenance utilities such as `generate_emoji_cldr.sh` for refreshing CLDR emoji data.
- `build-artifacts/` and `target/` — Generated build outputs; do not edit by hand.

## Build, Test, and Development Commands
- `make build` — Update Rust dependencies and build the Tauri backend (`cargo build` in `src-tauri/`).
- `make run` — Build and run the app in development mode via `cargo tauri dev`.
- `make dev` — Run `cargo tauri dev` without rebuilding dependencies.
- `make update-emoji` — Regenerate `dist/emoji-cldr.json` from the latest Unicode data.
- Manual alternative: `cd src-tauri && cargo tauri build` for a release bundle.

## Coding Style & Naming Conventions
- Rust: follow `rustfmt` defaults; run `cd src-tauri && cargo fmt` before committing.
- JavaScript in `dist/`: keep 2-space indentation, `const`/`let` usage, and naming consistent with existing code in `app.js`.
- Prefer descriptive, lower_snake_case for Rust variables/functions and UpperCamelCase for types.
- Avoid introducing new global state in the frontend; extend existing helpers in `app.js` where possible.

## Testing Guidelines
- There is currently no automated test harness wired up; add Rust tests using `#[cfg(test)]` modules in `src-tauri/src` and run them with `cd src-tauri && cargo test`.
- For frontend logic, follow the high-level scenarios in `TEST_SUITE_PLAN.md` when introducing a JS test setup (e.g., browser-like unit tests around `dist/app.js`).
- Keep tests small, deterministic, and colocated with the code they exercise.

## Commit & Pull Request Guidelines
- Use short, descriptive commit messages in the style of `git log` (e.g., “Fix emoji filter for hidden items”, “Add CLDR update script docs”).
- Each PR should include a concise summary, key implementation notes, and any relevant screenshots or OS details for user-visible UI changes.
- Reference related issues in the description (e.g., “Fixes #123”) and mention platform-specific considerations (Linux/Fedora, macOS, Windows) if the change affects build or runtime behavior.

## Tauri & Platform Notes
- Ensure a recent Rust toolchain is installed via `rustup`, and prefer the system linker (e.g., `/usr/bin/ld` on Fedora) to avoid GLIBC version mismatches.
- When running `make update-emoji`, verify the generated `dist/emoji-cldr.json` is valid JSON before committing.
