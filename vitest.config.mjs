import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup-env.js"],
    exclude: ["tests/e2e/**", "node_modules/**"]
  }
});

