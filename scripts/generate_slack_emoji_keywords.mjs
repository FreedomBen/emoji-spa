#!/usr/bin/env node
// Generate frontend/public/emoji-slack.json containing Slack-style shortcode
// keywords for each emoji. The upstream source is the iamcal/emoji-data
// project, which mirrors the shortcodes Slack understands.
//
// Usage:
//   node scripts/generate_slack_emoji_keywords.mjs [output_path] [source_json]
//
// - output_path: where to write the generated JSON (default:
//   frontend/public/emoji-slack.json)
// - source_json: optional path to a local emoji_pretty.json. When omitted, the
//   script downloads the latest emoji_pretty.json from GitHub.
//
// The output format mirrors the CLDR metadata we already consume:
// [
//   { "emoji": "😀", "name": "grinning face", "keywords": ["grinning", ":grinning:"] },
//   ...
// ]

import fs from "fs/promises";
import path from "path";
import https from "https";

const DEFAULT_SOURCE_URL =
  "https://raw.githubusercontent.com/iamcal/emoji-data/master/emoji_pretty.json";
const DEFAULT_OUTPUT_PATH = "frontend/public/emoji-slack.json";

const outputPath = process.argv[2] || DEFAULT_OUTPUT_PATH;
const sourcePath = process.argv[3] || null;

async function fetchJson(url) {
  const data = await new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} while fetching ${url}`));
          res.resume();
          return;
        }
        let raw = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => resolve(raw));
      })
      .on("error", reject);
  });
  return JSON.parse(data);
}

function unifiedToEmoji(unified) {
  const parts = unified.split("-").filter(Boolean);
  const codePoints = parts.map((p) => parseInt(p, 16));
  return String.fromCodePoint(...codePoints);
}

// Slack still supports a handful of legacy aliases that are not present in the
// upstream short_names list (e.g., :simple_smile: for 🙂). Add them explicitly.
const legacySlackAliasesByEmoji = {
  "🙂": ["simple_smile"]
};

async function loadSource() {
  if (sourcePath) {
    const raw = await fs.readFile(sourcePath, "utf8");
    return JSON.parse(raw);
  }
  return fetchJson(DEFAULT_SOURCE_URL);
}

function buildKeywords(shortNames, emoji) {
  const aliases = new Set();
  for (const name of shortNames) {
    if (!name) continue;
    aliases.add(name);
    aliases.add(`:${name}:`);
  }
  const legacy = legacySlackAliasesByEmoji[emoji];
  if (Array.isArray(legacy)) {
    for (const name of legacy) {
      if (!name) continue;
      aliases.add(name);
      aliases.add(`:${name}:`);
    }
  }
  return Array.from(aliases);
}

async function main() {
  const entries = await loadSource();
  if (!Array.isArray(entries) || !entries.length) {
    throw new Error("Emoji source is empty or invalid");
  }

  const output = [];
  for (const entry of entries) {
    if (!entry || !entry.unified) continue;
    const emoji = unifiedToEmoji(entry.unified);
    const shortNames = [
      entry.short_name,
      ...(Array.isArray(entry.short_names) ? entry.short_names : [])
    ].filter(Boolean);

    if (!shortNames.length) continue;

    const keywords = buildKeywords(shortNames, emoji);
    output.push({
      emoji,
      name: entry.name || entry.short_name || "",
      keywords
    });
  }

  // Ensure stable ordering for reproducible diffs.
  output.sort((a, b) => {
    if (a.emoji === b.emoji) return 0;
    return a.emoji.localeCompare(b.emoji);
  });

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(output, null, 2) + "\n", "utf8");
}

main().catch((error) => {
  console.error("Failed to generate Slack emoji keywords:", error);
  process.exit(1);
});
