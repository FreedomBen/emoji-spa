#!/usr/bin/env bash
set -euo pipefail

IMAGE_NAME="emoji-spa-builder"
ARTIFACTS_DIR="${ARTIFACTS_DIR:-build-artifacts}"

echo "Building Container image '${IMAGE_NAME}'..."
podman build -t "${IMAGE_NAME}" .

echo "Creating temporary container..."
CONTAINER_ID="$(podman create "${IMAGE_NAME}")"

echo "Copying build artifacts from container..."
rm -rf "${ARTIFACTS_DIR}"
mkdir -p "${ARTIFACTS_DIR}"
podman cp "${CONTAINER_ID}:/artifacts/." "${ARTIFACTS_DIR}/"

echo "Removing temporary container..."
podman rm "${CONTAINER_ID}" >/dev/null

echo "Build complete. Artifacts are in '${ARTIFACTS_DIR}':"
ls -R "${ARTIFACTS_DIR}"
