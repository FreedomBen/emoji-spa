# Unicode Emoji Picker (Tauri)

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
sudo dnf install \
  gtk3-devel \
  webkit2gtk3-devel \
  cairo-devel \
  pango-devel \
  openssl-devel \
  librsvg2-devel \
  libappindicator-gtk3-devel
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

From the repository root:

```bash
cd src-tauri
cargo tauri dev
```

This will build the Rust code, launch the Tauri window, and load the static UI from `dist/`.

To produce a release build:

```bash
cd src-tauri
cargo tauri build
```

## Using the emoji picker

1. Launch the app (`cargo tauri dev`).
2. Scroll through the emoji categories.
3. Click any emoji to copy it to your clipboard.
4. Paste the emoji into any other application that accepts text input.

