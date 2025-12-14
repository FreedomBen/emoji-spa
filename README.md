# Emoji Spa (Tauri)

This is a simple desktop application built with [Tauri](https://tauri.app/) and a plain HTML/CSS/JS frontend.

The app shows (single–codepoint) Unicode emoji grouped by rough category. Clicking any emoji copies it to your clipboard so you can paste it into other applications.

## Download

Grab pre-built AppImage, RPM, DEB, and Windows/macOS bundles from the [GitHub Releases page](https://github.com/FreedomBen/emoji-spa/releases). Each release entry lists the latest version plus its platform-specific artifacts.

## Project layout

- `frontend/` — Source for the HTML/CSS/JS UI plus static assets (emoji metadata, logos, icons).
- `dist/` — Generated web bundle emitted by Vite; loaded by Tauri and reused anywhere the static site is hosted.
- `extension-dist/` — Generated browser extension bundles (Chrome + Firefox).
- `src-tauri/` — Rust/Tauri backend and configuration.

## Prerequisites

- A recent Rust toolchain installed via [`rustup`](https://rustup.rs/) (recommended).
- Tauri CLI (optional but convenient):  
  `cargo install tauri-cli`

### Setting up rustup

If you do not already have Rust, install it via `rustup` (cross‑platform toolchain manager):

#### Install rustup on Fedora

```bash
sudo dnf install -y rustup
```

#### Cross-platform install

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

#### After installation

```bash
rustup-init
```

During the prompt, choose the default installation to get the stable toolchain and `cargo` on your `PATH`. After installation, restart your shell (or run `source ~/.cargo/env`), then verify with:

```bash
rustc --version
cargo --version
rustup update stable
```

You may wish to persist the PATH updates:

```bash
echo '[ -d "${HOME}/.cargo/bin" ] && export PATH="${HOME}/.cargo/bin:${PATH}"' >> ~/.bash_profile
```

#### Windows

On Windows, use an elevated PowerShell or Command Prompt to run the same installer command (it downloads `rustup-init.exe` and guides you through the defaults). When done, reopen the terminal so the `%USERPROFILE%\.cargo\bin` directory is on `PATH`.

### Fedora dependencies

On Fedora you need a working system C/C++ toolchain plus the libraries Tauri/WebKit depend on.

Install the basic build tools:

```bash
sudo dnf groupinstall "Development Tools"
```

Then install the common Tauri GUI/WebKit dependencies:

```bash
# If you installed rust through rustup earlier, skip this part:
sudo dnf install -y \
  rust \
  cargo

sudo dnf install -y \
  gtk3-devel \
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
npm install           # first time only
make dev              # builds the web UI and launches cargo tauri dev
```

`make build` performs the same steps but runs `cargo build` instead of `cargo tauri dev`. Both commands ensure the Vite bundle in `dist/` is freshly rebuilt before Tauri runs.

### Release build

To produce a release build:

```bash
npm run build:web
cd src-tauri
cargo tauri build
```

An AppImage will appear in `src-tauri/target/release/bundle/appimage/*.AppImage`.

### Browser extension builds

The browser extension ships the exact same UI and runs entirely offline inside the extension sandbox. Build both Chrome and Firefox bundles with:

```bash
npm run build:extension
```

Artifacts land in `extension-dist/chrome` and `extension-dist/firefox`. Each folder can be loaded as an “unpacked” extension or zipped for the respective stores. Use `npm run build:extension:chrome` or `npm run build:extension:firefox` to build a single target.

**Load in Chrome (or Chromium-based browsers)**
- Open `chrome://extensions`, enable *Developer mode*, click *Load unpacked*, and select `extension-dist/chrome`.

**Load in Firefox**
- Open `about:debugging#/runtime/this-firefox`, choose *Load Temporary Add-on*, and pick `extension-dist/firefox/manifest.json` (or any file in that folder).

## Using the emoji picker

1. Launch the app (`cargo tauri dev`).
2. Scroll through the emoji categories.
3. Click any emoji to copy it to your clipboard.
4. Paste the emoji into any other application that accepts text input.

### Keyboard shortcuts & navigation

| Shortcut | Description |
| --- | --- |
| `Ctrl+S` / `Cmd+S` | Focus the search field and select the current text so you can immediately type a new query. |
| `Ctrl+W` / `Cmd+W` (Tauri) | Close the Emoji Spa desktop window and exit the app. |
| `Ctrl+Q` / `Cmd+Q` (Tauri) | Close the Emoji Spa desktop window and exit the app. |
| `← → ↑ ↓`, `Home`, `End` | Move between emojis inside the grid. `Home` jumps to the first emoji in the current grid, `End` jumps to the last, `↑` on the first row jumps back to search, and `↓` from the search field (caret at the end) dives into the first visible emoji. |
| `Enter` / `Space` | Copy the focused emoji, just like clicking it. |
| `Escape` | Close any open overlays/menus, clear the search field, and focus it for immediate typing. |
| Any letters/numbers | Moves focus to the search field, appends the typed characters to the end, then re-filters results (focus moves to the first matching emoji if needed). |
