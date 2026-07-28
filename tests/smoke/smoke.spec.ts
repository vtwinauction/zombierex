/**
 * ZOMBIEREX — Public routes smoke test.
 * Run with:  bunx playwright test tests/smoke
 * Requires the dev server (bun run dev) to be up on http://localhost:8080.
 */
import { test, expect } from "@playwright/test";

const PUBLIC_ROUTES = ["/", "/auth", "/legal/terms", "/legal/privacy"];

for (const path of PUBLIC_ROUTES) {
  test(`route renders without console errors: ${path}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    const res = await page.goto(`http://localhost:8080${path}`, { waitUntil: "domcontentloaded" });
    expect(res?.status(), `HTTP status for ${path}`).toBeLessThan(500);

    // Give hydration a beat to surface runtime errors.
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});

    // Filter noise we don't control (extension chatter, third-party analytics beacons).
    const meaningful = errors.filter(
      (e) => !/chrome-extension|extension:\/\/|Failed to load resource.*\/analytics/i.test(e),
    );
    expect(meaningful, `console errors on ${path}: ${meaningful.join(" | ")}`).toEqual([]);
  });
}

test("home shell has main navigation", async ({ page }) => {
  await page.goto("http://localhost:8080/");
  // Bottom nav is the primary shell affordance on the feed.
  await expect(page.locator("nav").first()).toBeVisible({ timeout: 10_000 });
});
