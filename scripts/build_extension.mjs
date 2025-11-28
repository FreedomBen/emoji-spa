#!/usr/bin/env node
import { build } from "vite";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import createManifest from "../extension/manifest.config.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const VALID_TARGETS = ["chrome", "firefox"];

function parseTargets(args) {
  if (!args.length) return VALID_TARGETS;
  const normalized = args.map((arg) => String(arg || "").toLowerCase());
  for (const target of normalized) {
    if (!VALID_TARGETS.includes(target)) {
      throw new Error(`Unknown browser target "${target}". Valid targets: ${VALID_TARGETS.join(", ")}`);
    }
  }
  return Array.from(new Set(normalized));
}

async function ensureDist() {
  console.log("Building web bundle with Vite...");
  await build({
    configFile: path.resolve(repoRoot, "vite.config.ts"),
    logLevel: "info"
  });
}

async function copyDistTo(targetDir) {
  const source = path.resolve(repoRoot, "dist");
  await fs.rm(targetDir, { recursive: true, force: true });
  await fs.mkdir(targetDir, { recursive: true });
  await fs.cp(source, targetDir, { recursive: true });
}

async function writeManifest(targetDir, browser) {
  const manifest = createManifest(browser);
  const manifestPath = path.join(targetDir, "manifest.json");
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
}

async function buildExtensions(targets) {
  await ensureDist();
  const extensionRoot = path.resolve(repoRoot, "extension-dist");

  for (const browser of targets) {
    const targetDir = path.join(extensionRoot, browser);
    await copyDistTo(targetDir);
    await writeManifest(targetDir, browser);
    console.log(`Created ${browser} extension bundle at ${targetDir}`);
  }
}

async function main() {
  try {
    const args = process.argv.slice(2);
    const targets = parseTargets(args);
    await buildExtensions(targets);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

await main();
