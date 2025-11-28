import { defineConfig } from "vite";
import path from "path";

const rootDir = path.resolve(__dirname, "frontend");

export const baseConfig = {
  root: rootDir,
  base: "./",
  publicDir: path.resolve(rootDir, "public"),
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true
  }
};

export default defineConfig(baseConfig);
