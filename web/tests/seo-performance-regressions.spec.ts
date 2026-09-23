import { expect, test } from "@playwright/test";

for (const pathname of ["/fr", "/fr/about", "/zz"]) {
  test(`unsupported locale ${pathname} has a rendered, uncrawlable 404`, async ({ request }) => {
    const response = await request.get(pathname);

    expect(response.status()).toBe(404);
    expect(response.headers()["x-robots-tag"]).toBe("noindex, nofollow");
    expect(response.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(await response.text()).toContain("<html");
  });
}

test("mobile space film keeps its poster until a visitor plays it", async ({ page }) => {
  const videos: string[] = [];
  page.on("request", (request) => {
    if (request.url().endsWith(".mp4")) videos.push(request.url());
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/en/about");
  await page.locator(".space-film").first().scrollIntoViewIfNeeded();
  await expect(page.locator(".space-film").first()).toHaveAttribute("data-ready", "true");
  expect((await page.locator(".space-film").first().boundingBox())?.width).toBeGreaterThan(300);
  expect(videos).toHaveLength(0);

  await page.locator(".space-film-toggle").first().click();
  await expect.poll(() => videos.length).toBeGreaterThan(0);
});

for (const network of [{ saveData: true, effectiveType: "4g" }, { saveData: false, effectiveType: "2g" }]) {
  test(`desktop ${network.saveData ? "Save-Data" : "slow network"} avoids automatic film transfer`, async ({ page }) => {
    await page.addInitScript((connection) => {
      Object.defineProperty(navigator, "connection", { configurable: true, value: connection });
    }, network);
    const videos: string[] = [];
    page.on("request", (request) => {
      if (request.url().endsWith(".mp4")) videos.push(request.url());
    });
    await page.goto("/en/about");
    await page.locator(".space-film").first().scrollIntoViewIfNeeded();
    await expect(page.locator(".space-film").first()).toHaveAttribute("data-ready", "true");
    expect(videos).toHaveLength(0);
  });
}

test("desktop film still autoplays when motion and data are allowed", async ({ page }) => {
  const videos: string[] = [];
  page.on("request", (request) => {
    if (request.url().endsWith(".mp4")) videos.push(request.url());
  });
  await page.goto("/en/about");
  await page.locator(".space-film").first().scrollIntoViewIfNeeded();
  await expect.poll(() => videos.length).toBeGreaterThan(0);
});

test("reduced motion still prevents automatic film transfer", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const videos: string[] = [];
  page.on("request", (request) => {
    if (request.url().endsWith(".mp4")) videos.push(request.url());
  });
  await page.goto("/en/about");
  await page.locator(".space-film").first().scrollIntoViewIfNeeded();
  await expect(page.locator(".space-film").first()).toHaveAttribute("data-ready", "true");
  expect(videos).toHaveLength(0);
});

test("public static media is reusable while uploaded content stays private", async ({ request }) => {
  for (const pathname of [
    "/brand/share-default.jpg",
    "/images/space-tour/lounge.webp",
    "/images/space-tour/lounge.mp4",
  ]) {
    const response = await request.get(pathname);
    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toContain("public, max-age=86400");
  }

  const font = await request.get("/fonts/pretendard-v1.3.9/woff2-dynamic-subset/PretendardVariable.subset.0.woff2");
  expect(font.status()).toBe(200);
  expect(font.headers()["cache-control"]).toContain("public, max-age=31536000, immutable");

  const upload = await request.get("/images/uploads/missing.webp");
  expect(upload.headers()["cache-control"]).toContain("no-store");
});
