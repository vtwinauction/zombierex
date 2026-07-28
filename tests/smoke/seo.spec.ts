/**
 * ZOMBIEREX — SEO & static asset smoke.
 * Run with:  bunx playwright test tests/smoke/seo.spec.ts
 */
import { test, expect } from "@playwright/test";

const BASE = "http://localhost:8080";

test("robots.txt served", async ({ request }) => {
  const r = await request.get(`${BASE}/robots.txt`);
  expect(r.status()).toBe(200);
  expect((await r.text()).toLowerCase()).toContain("user-agent");
});

test("sitemap.xml served with urls", async ({ request }) => {
  const r = await request.get(`${BASE}/sitemap.xml`);
  expect(r.status()).toBe(200);
  const body = await r.text();
  expect(body).toContain("<urlset");
  expect(body).toMatch(/<loc>https?:\/\//);
});

const HEAD_ROUTES = ["/", "/marketplace", "/reels", "/events", "/atlas", "/communities"];

for (const path of HEAD_ROUTES) {
  test(`route has unique title + og tags: ${path}`, async ({ page }) => {
    await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
    const title = await page.title();
    expect(title.length, `title for ${path}`).toBeGreaterThan(3);
    expect(title.toLowerCase()).not.toBe("lovable app");
    expect(title.toLowerCase()).not.toContain("lovable generated");

    const desc = await page.locator('meta[name="description"]').getAttribute("content");
    expect(desc?.length ?? 0, `meta description for ${path}`).toBeGreaterThan(10);

    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute("content");
    expect(ogTitle?.length ?? 0, `og:title for ${path}`).toBeGreaterThan(0);
  });
}

test("viewport meta tag present", async ({ page }) => {
  await page.goto(BASE);
  const viewport = await page.locator('meta[name="viewport"]').getAttribute("content");
  expect(viewport).toMatch(/width=device-width/);
});
