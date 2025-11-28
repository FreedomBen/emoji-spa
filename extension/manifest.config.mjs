import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ICON_PATHS = {
  16: "icons/icon-16.png",
  32: "icons/icon-32.png",
  48: "icons/icon-48.png",
  128: "icons/icon-128.png"
};

function readPackageVersion() {
  const pkgPath = path.resolve(__dirname, "../package.json");
  const raw = fs.readFileSync(pkgPath, "utf-8");
  const pkg = JSON.parse(raw);
  return typeof pkg.version === "string" ? pkg.version : "0.0.1";
}

export default function createManifest(browser = "chrome") {
  const version = readPackageVersion();

  const manifest = {
    manifest_version: 3,
    name: "Emoji Spa",
    description: "Offline emoji picker with search, favorites, and usage tracking.",
    version,
    action: {
      default_title: "Emoji Spa",
      default_popup: "index.html",
      default_icon: ICON_PATHS
    },
    icons: ICON_PATHS,
    options_ui: {
      page: "index.html",
      open_in_tab: true
    },
    permissions: [],
    host_permissions: []
  };

  if (browser === "firefox") {
    manifest.browser_specific_settings = {
      gecko: {
        id: "emoji-spa@example.com",
        strict_min_version: "109.0"
      }
    };
  }

  return manifest;
}
