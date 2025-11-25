#!/usr/bin/env bash
set -euo pipefail

IMAGE_NAME="characters-tauri-builder"
ARTIFACTS_DIR="${ARTIFACTS_DIR:-build-artifacts}"

echo "Building Docker image '${IMAGE_NAME}'..."
docker build -t "${IMAGE_NAME}" .

echo "Creating temporary container..."
CONTAINER_ID="$(docker create "${IMAGE_NAME}")"

echo "Copying build artifacts from container..."
mkdir -p "${ARTIFACTS_DIR}"
docker cp "${CONTAINER_ID}:/artifacts/." "${ARTIFACTS_DIR}/"

echo "Removing temporary container..."
docker rm "${CONTAINER_ID}" >/dev/null

echo "Build complete. Artifacts are in '${ARTIFACTS_DIR}':"
ls -R "${ARTIFACTS_DIR}"

