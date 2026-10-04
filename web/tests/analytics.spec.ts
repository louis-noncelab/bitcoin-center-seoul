import { expect, test, type Page } from "@playwright/test";

// The suite mirrors the server's build-time configuration: start the review server with
// NEXT_PUBLIC_GTM_ID=GTM-TEST and run with the same variable to cover the GTM path, or leave it
// unset on both to confirm nothing third-party is rendered.
const gtmId = process.env.NEXT_PUBLIC_GTM_ID?.trim() ?? "";

type Entry = Record<string, unknown>;

async function waitForEntry(page: Page, expected: Entry): Promise<Entry> {
  const handle = await page.waitForFunction((match) => {
    const layer = (window as unknown as { dataLayer?: Record<string, unknown>[] }).dataLayer ?? [];
    return layer.find((entry) => Object.entries(match).every(([key, value]) => entry?.[key] === value)) ?? false;
  }, expected);
  return await handle.jsonValue() as Entry;
}

test.beforeEach(async ({ context }) => {
  // Never send test traffic to Google; the dataLayer contract is what the site owns.
  await context.route(/^https:\/\/(?:[^/]+\.)?(?:googletagmanager|google-analytics)\.com\//, (route) =>
    route.fulfill({ status: 200, contentType: "text/javascript", body: "" }));
});

test.describe("with a GTM container configured", () => {
  test.skip(!gtmId, "Run with NEXT_PUBLIC_GTM_ID=GTM-TEST on both the server build and the test runner.");

  test("home loads the container and initializes the dataLayer", async ({ page }) => {
    await page.goto("/ko");
    await expect(page.locator("script#_next-gtm")).toHaveAttribute("src", new RegExp(`googletagmanager\\.com/gtm\\.js\\?id=${gtmId}`));
    await waitForEntry(page, { event: "gtm.js" });
  });

  test("program detail pushes view_item for a meetup", async ({ page }) => {
    await page.goto("/ko/programs");
    const program = page.locator('a[href^="/ko/programs/"]').first();
    test.skip(await program.count() === 0, "The review database has no published program.");
    const href = await program.getAttribute("href") ?? "";
    await page.goto(href);
    const entry = await waitForEntry(page, { event: "view_item", kind: "meetup", locale: "ko" });
    expect(entry.item_id).toBe(new URL(page.url()).pathname.split("/").pop());
    expect(typeof entry.item_name === "string" && entry.item_name.length > 0).toBe(true);
  });

  test("meetup checkout pushes begin_checkout", async ({ page }) => {
    await page.goto("/en/checkout?variant=analytics-test-variant&quantity=2&kind=meetup");
    await waitForEntry(page, { event: "begin_checkout", kind: "meetup", item_id: "analytics-test-variant", quantity: 2, locale: "en" });
  });

  test("a received collaboration proposal pushes collab_submit", async ({ page }) => {
    await page.route("**/api/collaboration", (route) => route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ data: { received: true } }) }));
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/ko");
    await page.locator(".footer-collaboration").click();
    const dialog = page.locator(".collaboration-dialog");
    await page.locator("#collaboration-name").fill("Test Proposer");
    await page.locator("#collaboration-email").fill("proposal@example.invalid");
    await page.locator("#collaboration-type").selectOption("community");
    await page.locator("#collaboration-message").fill("A community Bitcoin workshop proposal.");
    await dialog.locator('input[name="consent"]').check();
    await dialog.getByRole("button", { name: "제안 보내기" }).click();
    await expect(dialog.getByRole("status")).toBeVisible();
    await waitForEntry(page, { event: "collab_submit", locale: "ko" });
  });

  test("footer links track X clicks and keep the meetup link on the site", async ({ page, context }) => {
    await context.route(/^https:\/\/x\.com\//, (route) => route.fulfill({ contentType: "text/html", body: "<!doctype html><title>X fixture</title>" }));
    await page.goto("/ko");
    await expect(page.locator('.footer-commerce a[href="/ko/programs"]')).toBeVisible();
    // Event cards may still link to SatB booking pages; only the footer link moved on-site.
    await expect(page.locator('.site-footer a[href*="saturdayblock.com"]')).toHaveCount(0);
    const popup = page.waitForEvent("popup");
    await page.locator('.footer-actions a[href="https://x.com/BtcCtrSeoul"]').click();
    await (await popup).close();
    await waitForEntry(page, { event: "outbound_click", destination: "x", locale: "ko" });
  });

  test("external event booking links push outbound_legacy_meetup", async ({ page, context }) => {
    await context.route(/^https:\/\/(?:www\.)?saturdayblock\.com\//, (route) => route.fulfill({ contentType: "text/html", body: "<!doctype html><title>Booking fixture</title>" }));
    await page.goto("/ko/programs");
    const booking = page.locator('a.event-booking-link[target="_blank"]').first();
    test.skip(await booking.count() === 0, "The review database has no program with an external booking link.");
    const popup = page.waitForEvent("popup");
    await booking.click();
    await (await popup).close();
    await waitForEntry(page, { event: "outbound_legacy_meetup", locale: "ko" });
  });

  test("a settled payment pushes purchase once, then hard-navigates to the confirmation", async ({ page }) => {
    const code = "0123456789abcdef01234567";
    // Keep a copy of every push in sessionStorage so it survives the hard navigation.
    await page.addInitScript(() => {
      const layer: unknown[] = [];
      layer.push = (...entries: unknown[]) => {
        const log = JSON.parse(sessionStorage.getItem("analytics_test_log") ?? "[]") as unknown[];
        sessionStorage.setItem("analytics_test_log", JSON.stringify([...log, ...entries]));
        return Array.prototype.push.apply(layer, entries);
      };
      (window as unknown as { dataLayer: unknown[] }).dataLayer = layer;
    });
    const future = new Date(Date.now() + 600_000).toISOString();
    await page.route("**/api/payments/analytics-payment/status", (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ data: {
      id: "analytics-payment", orderId: "analytics-order", provider: "LNURL", mode: "REVIEW", status: "PAID", amountSats: "52000", currency: "BTC", expiresAt: future,
      checkoutUrl: null, paymentRequest: null, confirmationCode: code, review: false, creationUnknown: false, reviewReason: null,
    } }) }));
    await page.route("**/api/orders/analytics-order", (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ data: {
      id: "analytics-order", amountSats: "52000", amountKrw: "78000", customerName: "Test", customerEmail: "buyer@example.invalid", customerPhone: "", holdExpiresAt: null,
      createdAt: future, payments: [], status: "PAID", fulfillment: "PICKUP", fulfillmentStatus: "UNFULFILLED", address: null, shippingAmountSats: "0", carrier: null, trackingNumber: null,
      items: [{ sku: "MEETUP-7", titleKo: "테스트 밋업", titleEn: "Test meetup", optionLabelKo: "", optionLabelEn: "", quantity: 1, amountSats: "52000" }],
    } }) }));
    await page.goto("/ko/payments/analytics-payment");
    await page.waitForURL(`**/ko/orders/confirm/${code}`);
    await expect(page.locator("script#_next-gtm")).toHaveCount(0);
    const log = await page.evaluate(() => JSON.parse(sessionStorage.getItem("analytics_test_log") ?? "[]") as Record<string, unknown>[]);
    expect(log.filter((entry) => entry.event === "purchase")).toEqual([{
      event: "purchase", order_id: "analytics-order", transaction_id: "analytics-order", locale: "ko", kind: "meetup", item_name: "테스트 밋업", value: 78000, currency: "KRW",
    }]);
    expect(await page.evaluate(() => sessionStorage.getItem("ga_purchase_analytics-order"))).toBe("1");
  });

  test("the bearer confirmation page never loads the container", async ({ page }) => {
    await page.goto("/ko/orders/confirm/0123456789abcdef01234567");
    await expect(page.locator("script#_next-gtm")).toHaveCount(0);
    expect(await page.evaluate(() => document.querySelector('meta[name="referrer"]')?.getAttribute("content"))).toBe("strict-origin");
  });

  test("admin screens never load the container", async ({ page }) => {
    await page.goto("/ko/admin");
    await expect(page.locator("script#_next-gtm")).toHaveCount(0);
  });
});

test.describe("without a GTM container", () => {
  test.skip(Boolean(gtmId), "Covers the default build where NEXT_PUBLIC_GTM_ID is unset.");

  test("no Google Tag Manager script is rendered", async ({ page }) => {
    const response = await page.goto("/ko");
    await expect(page.locator('script#_next-gtm, script[src*="googletagmanager.com"]')).toHaveCount(0);
    expect(response?.headers()["content-security-policy"] ?? "").not.toContain("googletagmanager.com");
    const initialized = await page.evaluate(() => ((window as unknown as { dataLayer?: Record<string, unknown>[] }).dataLayer ?? []).some((entry) => entry.event === "gtm.js"));
    expect(initialized).toBe(false);
  });
});
