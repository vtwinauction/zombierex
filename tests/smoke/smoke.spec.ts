/**
 * ZOMBIEREX — Public routes smoke test.
 * Run with:  bunx playwright test tests/smoke
 * Requires the dev server (bun run dev) to be up on http://localhost:8080.
 */
import { test, expect } from "@playwright/test";

const PUBLIC_ROUTES = [
  "/",
  "/auth",
  "/legal/terms",
  "/legal/privacy",
  "/legal/community-guidelines",
  "/reels",
  "/marketplace",
  "/atlas",
  "/search",
  "/events",
  "/communities",
];

for (const path of PUBLIC_ROUTES) {
  test(`route renders without console errors: ${path}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    const res = await page.goto(`http://localhost:8080${path}`, { waitUntil: "domcontentloaded" });
    expect(res?.status(), `HTTP status for ${path}`).toBeLessThan(500);

    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});

    // Filter noise we don't control (extensions, third-party analytics, expected auth 401s on
    // public pages, and the Maps key referrer restriction that never allows localhost).
    const meaningful = errors.filter(
      (e) =>
        !/chrome-extension|extension:\/\/|Failed to load resource.*\/analytics|401|Unauthorized|net::ERR_ABORTED|RefererNotAllowedMapError|Google Maps JavaScript API error/i.test(
          e,
        ),
    );

    expect(meaningful, `console errors on ${path}: ${meaningful.join(" | ")}`).toEqual([]);
  });
}

test("home shell has main navigation", async ({ page }) => {
  await page.goto("http://localhost:8080/");
  await expect(page.locator("nav").first()).toBeVisible({ timeout: 10_000 });
});

test("auth page exposes sign-in affordance", async ({ page }) => {
  await page.goto("http://localhost:8080/auth");
  const signInAffordance = page.getByRole("button", { name: /sign in|log in|continue|google/i }).first();
  await expect(signInAffordance).toBeVisible({ timeout: 10_000 });
});

test("protected route redirects unauthenticated users to /auth", async ({ page }) => {
  await page.goto("http://localhost:8080/settings", { waitUntil: "domcontentloaded" });
  await page.waitForURL(/\/auth/, { timeout: 25_000 }).catch(() => {});
  expect(page.url()).toMatch(/\/auth/);
});

test("marketplace surface renders listings container", async ({ page }) => {
  await page.goto("http://localhost:8080/marketplace");
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
  // The Vault renders a main region; even an empty state should be present.
  await expect(page.locator("main, [role='main']").first()).toBeVisible({ timeout: 10_000 });
});

test("legal pages expose account deletion path", async ({ page }) => {
  await page.goto("http://localhost:8080/legal/privacy");
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
  const body = await page.textContent("body");
  expect(body?.toLowerCase()).toContain("delete");
});
