/**
 * ZOMBIEREX — Baseline accessibility & responsive smoke.
 * Fast structural checks (no axe dependency): unique H1, alt text on images,
 * viewport meta, tap-friendly nav on mobile widths, no horizontal overflow.
 */
import { test, expect, devices } from "@playwright/test";

const ROUTES = ["/", "/marketplace", "/atlas", "/reels", "/events", "/communities"];

for (const path of ROUTES) {
  test(`document has viewport meta and at most one h1: ${path}`, async ({ page }) => {
    await page.goto(`http://localhost:8080${path}`, { waitUntil: "domcontentloaded" });
    const viewport = await page.locator('meta[name="viewport"]').getAttribute("content");
    expect(viewport, `viewport meta on ${path}`).toMatch(/width=device-width/i);

    const h1Count = await page.locator("h1").count();
    expect(h1Count, `h1 count on ${path}`).toBeLessThanOrEqual(1);
  });

  test(`images have alt attributes: ${path}`, async ({ page }) => {
    await page.goto(`http://localhost:8080${path}`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    const missing = await page.$$eval("img", (imgs) =>
      imgs.filter((i) => !i.hasAttribute("alt")).map((i) => i.getAttribute("src") ?? "(no src)"),
    );
    expect(missing, `images missing alt on ${path}: ${missing.join(", ")}`).toEqual([]);
  });
}

test.describe("mobile viewport (iPhone 13)", () => {
  // Only override emulation options — spreading the full device descriptor sets
  // `defaultBrowserType`, which Playwright forbids inside a describe group.
  const iphone = devices["iPhone 13"];
  test.use({
    viewport: iphone.viewport,
    userAgent: iphone.userAgent,
    deviceScaleFactor: iphone.deviceScaleFactor,
    isMobile: iphone.isMobile,
    hasTouch: iphone.hasTouch,
  });


  test("no horizontal overflow on home", async ({ page }) => {
    await page.goto("http://localhost:8080/", { waitUntil: "domcontentloaded" });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, "horizontal overflow px").toBeLessThanOrEqual(2);
  });

  test("primary navigation is reachable on mobile", async ({ page }) => {
    await page.goto("http://localhost:8080/", { waitUntil: "domcontentloaded" });
    // "/" is the marketing site: the link bar collapses into a menu button at
    // mobile widths, so either affordance counts as reachable navigation.
    const nav = page.locator("nav:visible, button[aria-label*='menu' i], button[aria-controls*='menu' i]").first();
    await expect(nav).toBeVisible({ timeout: 10_000 });
  });

});
