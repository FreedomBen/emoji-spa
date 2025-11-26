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

echo "Normalizing artifact filenames (emoji-spa, no spaces)..."
for dir in "${ARTIFACTS_DIR}/bundle/appimage" "${ARTIFACTS_DIR}/bundle/deb" "${ARTIFACTS_DIR}/bundle/rpm"; do
  if [[ -d "${dir}" ]]; then
    while IFS= read -r -d '' path; do
      base="$(basename "${path}")"
      new_base="${base//Emoji Spa/emoji-spa}"
      if [[ "${base}" != "${new_base}" ]]; then
        mv "${path}" "$(dirname "${path}")/${new_base}"
      fi
    done < <(find "${dir}" -maxdepth 1 -mindepth 1 -name 'Emoji Spa*' -print0)
  fi
done

echo "Removing temporary container..."
podman rm "${CONTAINER_ID}" >/dev/null

echo "Build complete. Artifacts are in '${ARTIFACTS_DIR}':"
ls -R "${ARTIFACTS_DIR}"
