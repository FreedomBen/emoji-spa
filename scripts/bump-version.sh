#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "$REPO_ROOT"

if ! command -v node >/dev/null 2>&1; then
  echo "Error: node is required to run this script." >&2
  exit 1
fi

if [[ $# -eq 0 ]]; then
  CURRENT_VERSION="$(
    node <<'NODE'
const fs = require("fs");
const data = JSON.parse(fs.readFileSync("package.json", "utf8"));
if (!data.version) {
  throw new Error("Missing version field in package.json");
}
console.log(data.version);
NODE
  )"
  echo "Current version: $CURRENT_VERSION"
  exit 0
fi

if [[ $# -ne 1 ]]; then
  echo "Usage: $(basename "$0") <new-version>" >&2
  exit 1
fi

RAW_VERSION="$1"

if [[ ! $RAW_VERSION =~ ^v?[0-9]+\.[0-9]+\.[0-9]+([.-][0-9A-Za-z]+)*$ ]]; then
  echo "Error: version must look like 1.2.3 or v1.2.3-beta.1" >&2
  exit 1
fi

NEW_VERSION="${RAW_VERSION#v}"

update_json_version() {
  local file="$1"
  node - "$NEW_VERSION" "$file" <<'NODE'
const fs = require("fs");
const version = process.argv[2];
const file = process.argv[3];
const text = fs.readFileSync(file, "utf8");
const data = JSON.parse(text);
if (!Object.prototype.hasOwnProperty.call(data, "version")) {
  throw new Error(`Missing version field in ${file}`);
}
data.version = version;
fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
NODE
}

echo "Updating package.json"
update_json_version "package.json"

echo "Updating package-lock.json"
node - "$NEW_VERSION" "package-lock.json" <<'NODE'
const fs = require("fs");
const version = process.argv[2];
const file = process.argv[3];
const text = fs.readFileSync(file, "utf8");
const data = JSON.parse(text);
data.version = version;
if (data.packages && data.packages[""]) {
  data.packages[""].version = version;
} else {
  throw new Error("package-lock.json is missing the root packages[\"\"] entry");
}
fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
NODE

echo "Updating src-tauri/tauri.conf.json"
update_json_version "src-tauri/tauri.conf.json"

echo "Updating src-tauri/Cargo.toml"
node - "$NEW_VERSION" "src-tauri/Cargo.toml" <<'NODE'
const fs = require("fs");
const version = process.argv[2];
const file = process.argv[3];
const text = fs.readFileSync(file, "utf8");
const eol = text.includes("\r\n") ? "\r\n" : "\n";
const lines = text.split(/\r?\n/);
let inPackage = false;
let updated = false;
for (let i = 0; i < lines.length; i++) {
  const trimmed = lines[i].trim();
  if (/^\[.*\]/.test(trimmed)) {
    inPackage = trimmed === "[package]";
  }
  if (inPackage && trimmed.startsWith("version")) {
    const indent = lines[i].slice(0, lines[i].length - lines[i].trimStart().length);
    lines[i] = `${indent}version = "${version}"`;
    inPackage = false;
    updated = true;
  }
}
if (!updated) {
  throw new Error("Failed to update version in Cargo.toml");
}
let output = lines.join(eol);
if (!output.endsWith(eol)) {
  output += eol;
}
fs.writeFileSync(file, output);
NODE

echo "Updating src-tauri/Cargo.lock"
node - "$NEW_VERSION" "src-tauri/Cargo.lock" <<'NODE'
const fs = require("fs");
const version = process.argv[2];
const file = process.argv[3];
const text = fs.readFileSync(file, "utf8");
const eol = text.includes("\r\n") ? "\r\n" : "\n";
const lines = text.split(/\r?\n/);
let inTarget = false;
let updated = false;
for (let i = 0; i < lines.length; i++) {
  const trimmed = lines[i].trim();
  if (trimmed === "[[package]]") {
    inTarget = false;
  } else if (trimmed === 'name = "emoji-spa"') {
    inTarget = true;
  } else if (inTarget && trimmed.startsWith("version")) {
    const indent = lines[i].slice(0, lines[i].length - lines[i].trimStart().length);
    lines[i] = `${indent}version = "${version}"`;
    inTarget = false;
    updated = true;
  }
}
if (!updated) {
  throw new Error("Failed to update version in Cargo.lock");
}
let output = lines.join(eol);
if (!output.endsWith(eol)) {
  output += eol;
}
fs.writeFileSync(file, output);
NODE

echo "Version updated to $NEW_VERSION"
