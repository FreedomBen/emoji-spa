FROM rust:1.80-bullseye

# Install system dependencies required to build Tauri apps on Debian/Ubuntu.
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      libgtk-3-dev \
      libwebkit2gtk-4.0-dev \
      libayatana-appindicator3-dev \
      librsvg2-dev \
      pkg-config \
      build-essential \
      ca-certificates \
      curl \
      patchelf && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the entire project into the image.
COPY . .

# Install the Tauri CLI inside the container.
RUN cargo install tauri-cli

WORKDIR /app/src-tauri

# Build a release bundle for all supported formats.
RUN cargo tauri build --bundles all

# Collect build artifacts in a single directory for export.
RUN mkdir -p /artifacts && \
    cp target/release/characters-tauri /artifacts/characters-tauri && \
    cp -r target/release/bundle /artifacts/bundle

# Default command is a shell; the container is mainly used as a build environment.
CMD ["bash"]

