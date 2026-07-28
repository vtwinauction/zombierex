import { defineConfig, devices } from "@playwright/test";

/**
 * ZOMBIEREX smoke suite config.
 * Assumes the dev server is already running on http://localhost:8080
 * (Lovable preview) OR pass PW_BASE_URL to point elsewhere.
 */
export default defineConfig({
  testDir: "./tests/smoke",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: process.env.PW_BASE_URL ?? "http://localhost:8080",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
