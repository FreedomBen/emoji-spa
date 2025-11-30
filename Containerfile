FROM rust:latest

# Install system dependencies required to build Tauri apps on Debian/Ubuntu.
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      libgtk-3-dev \
      libwebkit2gtk-4.1-dev \
      libayatana-appindicator3-dev \
      librsvg2-dev \
      pkg-config \
      build-essential \
      ca-certificates \
      curl \
      patchelf && \
    rm -rf /var/lib/apt/lists/*

# Install the Tauri CLI before copying application code so the layer stays cached.
RUN cargo install tauri-cli

WORKDIR /app

# Copy only the Rust manifest files first to leverage Docker layer caching for dependencies.
COPY src-tauri/Cargo.toml src-tauri/Cargo.lock src-tauri/tauri.conf.json ./src-tauri/
# Provide a minimal source file so Cargo accepts the manifest, then prefetch deps.
RUN mkdir -p src-tauri/src && \
    printf 'fn main() {}' > src-tauri/src/main.rs && \
    cd src-tauri && cargo fetch

# Now copy the full project (invalidates cache only when sources change).
COPY . .

WORKDIR /app/src-tauri

# Build release bundles for all supported Linux formats (deb, rpm, appimage).
RUN cargo tauri build --bundles deb rpm appimage

# Collect build artifacts in a single directory for export.
RUN mkdir -p /artifacts && \
    cp target/release/emoji-spa /artifacts/emoji-spa && \
    cp -r target/release/bundle /artifacts/bundle

# Default command is a shell; the container is mainly used as a build environment.
CMD ["bash"]
