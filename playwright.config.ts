import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { defineConfig, devices } from "@playwright/test";

/**
 * Some CI/sandbox images ship a pre-baked Chromium whose build number differs
 * from the one this Playwright release expects. Reuse it when present instead
 * of failing with "Executable doesn't exist".
 */
function resolveChromium(): string | undefined {
  const explicit = process.env.PW_CHROMIUM_PATH;
  if (explicit && existsSync(explicit)) return explicit;
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH ?? "/opt/ms-playwright";
  if (!existsSync(root)) return undefined;
  for (const dir of readdirSync(root)) {
    if (!dir.startsWith("chromium-")) continue;
    const bin = join(root, dir, "chrome-linux", "chrome");
    if (existsSync(bin)) return bin;
  }
  return undefined;
}

const chromiumPath = resolveChromium();

/**
 * ZOMBIEREX smoke suite config.
 * Assumes the dev server is already running on http://localhost:8080
 * (Lovable preview) OR pass PW_BASE_URL to point elsewhere.
 */
export default defineConfig({
  testDir: "./tests/smoke",
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  // The Vite dev server is single-process; heavy parallelism makes on-demand
  // module transforms queue past the per-test timeout and flake. Keep it low.
  workers: process.env.PW_WORKERS ? Number(process.env.PW_WORKERS) : 2,
  retries: process.env.CI ? 1 : 1,

  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: process.env.PW_BASE_URL ?? "http://localhost:8080",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    ...(chromiumPath ? { launchOptions: { executablePath: chromiumPath } } : {}),
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
