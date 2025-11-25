#!/usr/bin/env bash
set -euo pipefail

# Generate dist/emoji-cldr.json from the latest Unicode emoji-test.txt file.
#
# Usage:
#   scripts/generate_emoji_cldr.sh [output-emoji-cldr.json]
#
# By default, output is written to: dist/emoji-cldr.json
# If the download or parsing fails, this script exits non-zero and does NOT
# modify any existing output file.

EMOJI_TEST_URL="https://unicode.org/Public/emoji/latest/emoji-test.txt"
OUTPUT_PATH="${1:-dist/emoji-cldr.json}"
LOCAL_EMOJI_TEST_PATH="dist/emoji-test.txt"

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

emoji_test_tmp="$tmp_dir/emoji-test.txt"
tmp_json="$tmp_dir/emoji-cldr.json"

if ! command -v wget >/dev/null 2>&1 && ! command -v curl >/dev/null 2>&1; then
  echo "Error: wget or curl is required to download emoji-test.txt" >&2
  exit 1
fi

echo "Downloading emoji-test.txt from ${EMOJI_TEST_URL}..." >&2

if command -v wget >/dev/null 2>&1; then
  # Use wget with a non-quiet progress bar.
  if ! wget --progress=bar:force:noscroll -O "$emoji_test_tmp" "$EMOJI_TEST_URL"; then
    echo "Error: failed to download emoji-test.txt with wget" >&2
    exit 1
  fi
else
  # -f: fail on HTTP errors
  # -S: show errors
  # -L: follow redirects
  # --progress-bar: show a simple progress bar on stderr
  if ! curl -fSL --progress-bar "$EMOJI_TEST_URL" -o "$emoji_test_tmp"; then
    echo "Error: failed to download emoji-test.txt with curl" >&2
    exit 1
  fi
fi

# Move the downloaded file into the repository so it is cached locally.
mkdir -p "$(dirname "$LOCAL_EMOJI_TEST_PATH")"
mv "$emoji_test_tmp" "$LOCAL_EMOJI_TEST_PATH"
echo "Saved emoji-test.txt to ${LOCAL_EMOJI_TEST_PATH}" >&2

echo "Generating emoji-cldr.json..." >&2

if ! awk '
BEGIN {
  print "["
  first = 1
  count = 0
}
{
  sub(/\r$/, "", $0)
  if ($0 ~ /^#/ || $0 ~ /^[[:space:]]*$/) next
  if (index($0, "#") == 0) next

  split($0, parts, "#")
  if (length(parts) < 2) next

  comment = parts[2]
  sub(/^[[:space:]]+/, "", comment)
  if (comment == "") next

  # comment examples:
  # 😀 grinning face
  # 😀 E1.0 grinning face
  n = split(comment, fields, /[[:space:]]+/)
  if (n < 2) next

  emoji = fields[1]
  if (emoji == "") next

  # remove leading emoji and following spaces
  sub("^" emoji "[[:space:]]*", "", comment)

  # optionally remove version marker like E1.0
  sub(/^E[0-9.]+[[:space:]]+/, "", comment)

  name = comment
  if (name == "") next

  lower = tolower(name)
  m = split(lower, words, /[^a-z0-9]+/)

  delete seen
  keywords = ""
  for (i = 1; i <= m; i++) {
    word = words[i]
    if (word == "") continue
    if (word in seen) continue
    seen[word] = 1
    if (keywords != "") keywords = keywords ","
    keywords = keywords "\"" escape(word) "\""
  }

  e_emoji = escape(emoji)
  e_name = escape(name)

  if (!first) {
    print ","
  }

  printf "  {\"emoji\":\"%s\",\"name\":\"%s\",\"keywords\":[%s]}", e_emoji, e_name, keywords

  first = 0
  count++
}
END {
  print "\n]"
  if (count == 0) {
    exit 1
  }
}
function escape(s,   out, i, c) {
  out = ""
  for (i = 1; i <= length(s); i++) {
    c = substr(s, i, 1)
    if (c == "\\") {
      out = out "\\\\"
    } else if (c == "\"") {
      out = out "\\\""
    } else if (c == "\b") {
      out = out "\\b"
    } else if (c == "\f") {
      out = out "\\f"
    } else if (c == "\n") {
      out = out "\\n"
    } else if (c == "\r") {
      out = out "\\r"
    } else if (c == "\t") {
      out = out "\\t"
    } else {
      out = out c
    }
  }
  return out
}
' "$LOCAL_EMOJI_TEST_PATH" > "$tmp_json"; then
  echo "Error: failed to parse emoji-test.txt; not updating ${OUTPUT_PATH}" >&2
  exit 1
fi

mkdir -p "$(dirname "$OUTPUT_PATH")"
mv "$tmp_json" "$OUTPUT_PATH"
echo "Wrote emoji CLDR metadata to ${OUTPUT_PATH}" >&2
