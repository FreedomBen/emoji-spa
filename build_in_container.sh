#!/usr/bin/env bash
set -euo pipefail

IMAGE_NAME="emoji-spa-builder"
ARTIFACTS_DIR="${ARTIFACTS_DIR:-build-artifacts}"
BUILD_FILE="${BUILD_FILE:-Containerfile}"
SHORT_SHA="${SHORT_SHA:-$(git rev-parse --short HEAD 2>/dev/null || echo unknown)}"
APPEND_SHORT_SHA="${APPEND_SHORT_SHA:-1}"

if [[ -z "${CONTAINER_RUNTIME:-}" ]]; then
  if command -v podman >/dev/null 2>&1; then
    CONTAINER_RUNTIME="podman"
  elif command -v docker >/dev/null 2>&1; then
    CONTAINER_RUNTIME="docker"
  else
    echo "Error: Neither podman nor docker is available." >&2
    exit 1
  fi
fi

echo "Using container runtime '${CONTAINER_RUNTIME}'."

echo "Building Container image '${IMAGE_NAME}' from '${BUILD_FILE}'..."
"${CONTAINER_RUNTIME}" build -f "${BUILD_FILE}" -t "${IMAGE_NAME}" .

echo "Creating temporary container..."
CONTAINER_ID="$("${CONTAINER_RUNTIME}" create "${IMAGE_NAME}")"

cleanup() {
  echo "Removing temporary container..."
  "${CONTAINER_RUNTIME}" rm "${CONTAINER_ID}" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "Copying build artifacts from container..."
rm -rf "${ARTIFACTS_DIR}"
mkdir -p "${ARTIFACTS_DIR}"
"${CONTAINER_RUNTIME}" cp "${CONTAINER_ID}:/artifacts/." "${ARTIFACTS_DIR}/"

echo "Normalizing artifact filenames..."
normalize_names() {
  local dir="$1"
  [[ -d "${dir}" ]] || return 0
  find "${dir}" -maxdepth 1 -type f -print0 | while IFS= read -r -d '' path; do
    local base="$(basename "${path}")"
    local new_base="${base//Emoji Spa/emoji-spa}"
    if [[ "${base}" != "${new_base}" ]]; then
      mv "${path}" "$(dirname "${path}")/${new_base}"
      path="$(dirname "${path}")/${new_base}"
    fi
    if [[ "${APPEND_SHORT_SHA}" != "0" ]]; then
      append_short_sha "${path}"
    fi
  done
}

append_short_sha() {
  local file="$1"
  local base="$(basename "${file}")"
  local dir="$(dirname "${file}")"
  local new_base="${base}"

  case "${base}" in
    *.AppImage|*.deb)
      if [[ "${base}" == *_*_* ]]; then
        local prefix="${base%%_*}"
        local remainder="${base#*_}"
        local tail="${remainder#*_}"
        new_base="${prefix}_${SHORT_SHA}_${tail}"
      fi
      ;;
    *.rpm)
      local stem="${base%.rpm}"
      if [[ "${stem}" == *-* ]]; then
        local release="${stem##*-}"
        local name_version="${stem%-${release}}"
        if [[ "${name_version}" == *-* ]]; then
          local version="${name_version##*-}"
          local name="${name_version%-${version}}"
          new_base="${name}-${SHORT_SHA}-${release}.rpm"
        fi
      fi
      ;;
  esac

  if [[ "${new_base}" != "${base}" ]]; then
    mv "${file}" "${dir}/${new_base}"
  fi
}

for dir in \
  "${ARTIFACTS_DIR}/bundle/appimage" \
  "${ARTIFACTS_DIR}/bundle/deb" \
  "${ARTIFACTS_DIR}/bundle/rpm"; do
  normalize_names "${dir}"
done

echo "Build complete. Artifacts are in '${ARTIFACTS_DIR}':"
ls -R "${ARTIFACTS_DIR}"
