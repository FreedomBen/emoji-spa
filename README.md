# Emoji Spa (Tauri)

This is a simple desktop application built with [Tauri](https://tauri.app/) and a plain HTML/CSS/JS frontend.

The app shows (single–codepoint) Unicode emoji grouped by rough category. Clicking any emoji copies it to your clipboard so you can paste it into other applications.

## Project layout

- `src-tauri/` — Rust/Tauri backend and configuration.
- `dist/` — Static frontend assets (`index.html`, `style.css`, `app.js`) loaded by Tauri.

## Prerequisites

- A recent Rust toolchain installed via [`rustup`](https://rustup.rs/) (recommended).
- Tauri CLI (optional but convenient):  
  `cargo install tauri-cli`

### Fedora dependencies

On Fedora you need a working system C/C++ toolchain plus the libraries Tauri/WebKit depend on.

Install the basic build tools:

```bash
sudo dnf groupinstall "Development Tools"
```

Then install the common Tauri GUI/WebKit dependencies:

```bash
sudo dnf install -y \
  rust \
  cargo \
  gtk3-devel \
  webkit2gtk3-devel \
  cairo-devel \
  pango-devel \
  openssl-devel \
  librsvg2-devel \
  libappindicator-gtk3-devel \
  javascriptcoregtk4.1-devel \
  libsoup3-devel \
  webkit2gtk4.1-devel
```

The build log in `src-tauri/out.log` shows failures like:

```text
/home/ben/.linuxbrew/bin/ld: .../libc.so.6: version `GLIBC_2.38' not found
```

This indicates that `ld` from Linuxbrew is being used instead of Fedora’s system linker. To avoid this class of error on Fedora:

- Prefer the system toolchain when building Tauri apps:
  - Ensure `/usr/bin` appears before any Linuxbrew paths in your `PATH`, or
  - Explicitly choose the system linker: `export LD=/usr/bin/ld`
- If you keep Linuxbrew installed, avoid running `cargo tauri` from shells where Linuxbrew’s `bin` directory comes first in `PATH`.

Once the system linker is used and the GUI dependencies above are installed, the project should compile successfully.

## Running the app

### In Development

From the repository root:

```bash
cd src-tauri
cargo update
cargo build
cargo install tauri-cli
cargo tauri dev
```

This will build the Rust code, launch the Tauri window, and load the static UI from `dist/`.

### Release build

To produce a release build:

```bash
cd src-tauri
cargo tauri build
```

An AppImage will appear in `src-tauri/target/release/bundle/appimage/*.AppImage`

## Using the emoji picker

1. Launch the app (`cargo tauri dev`).
2. Scroll through the emoji categories.
3. Click any emoji to copy it to your clipboard.
4. Paste the emoji into any other application that accepts text input.

### Keyboard shortcuts & navigation

- `Ctrl+S` (`Cmd+S` on macOS): Jump back to the search field and select the existing text so you can immediately type a new query.
- Arrow keys inside the emoji grid: Once an emoji has focus (via click or Tab), use `← → ↑ ↓` to move between emojis (the focus will wrap into the neighboring sections automatically). `Home` jumps to the first emoji in the current grid and `End` jumps to the last one.
- `Enter` (or `Space`) while an emoji is focused triggers the same copy action as clicking it, making the picker fully keyboard accessible.
- Typing letters/numbers while an emoji remains focused appends that text to the search field and re-filters results without stealing focus; if the focused emoji no longer matches, focus moves to the first visible emoji.
