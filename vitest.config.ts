import { defineConfig } from "vitest/config";

/**
 * Unit tests only. Playwright specs under tests/smoke run via `playwright test`
 * and must not be collected by Vitest (they use Playwright's own runner).
 */
export default defineConfig({
  test: {
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["tests/**", "node_modules/**", "dist/**", ".output/**"],
    environment: "node",
  },
});
