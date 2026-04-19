import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: {
    baseURL: "http://localhost:8080",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        contextOptions: {
          permissions: ["clipboard-read", "clipboard-write"],
        },
      },
    },
  ],
  webServer: {
    command: "make serve",
    url: "http://localhost:8080",
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
});
