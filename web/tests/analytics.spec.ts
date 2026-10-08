import { expect, test, type Page } from "@playwright/test";

// The suite mirrors the server's build-time configuration: start the review server with
// NEXT_PUBLIC_GTM_ID=GTM-TEST and NEXT_PUBLIC_ANALYTICS_APPROVED=true on both sides to cover
// the GTM path, or leave approval disabled to confirm nothing third-party is rendered.
const gtmId = process.env.NEXT_PUBLIC_ANALYTICS_APPROVED === "true" ? process.env.NEXT_PUBLIC_GTM_ID?.trim() ?? "" : "";

type Entry = Record<string, unknown>;

const code = "0123456789abcdef01234567";
const paidPayment = {
  id: "analytics-payment", orderId: "analytics-order", provider: "LNURL", mode: "REVIEW",
  status: "PAID", amountSats: "52000", currency: "BTC", expiresAt: "2030-01-01T00:00:00Z",
  checkoutUrl: null, paymentRequest: null, confirmationCode: code, review: false, creationUnknown: false, reviewReason: null,
};

async function recordEntries(page: Page) {
  await page.addInitScript(() => {
    const layer: unknown[] = [];
    layer.push = (...entries: unknown[]) => {
      const previous = JSON.parse(sessionStorage.getItem("analytics_test_log") ?? "[]") as unknown[];
      sessionStorage.setItem("analytics_test_log", JSON.stringify([...previous, ...entries]));
      return Array.prototype.push.apply(layer, entries);
    };
    (window as unknown as { dataLayer: unknown[] }).dataLayer = layer;
  });
}

async function waitForEntry(page: Page, expected: Entry): Promise<Entry> {
  const handle = await page.waitForFunction((match) => {
    const layer = (window as unknown as { dataLayer?: Record<string, unknown>[] }).dataLayer ?? [];
    return layer.find((entry) => Object.entries(match).every(([key, value]) => entry?.[key] === value)) ?? false;
  }, expected);
  return await handle.jsonValue() as Entry;
}

test.beforeEach(async ({ context }) => {
  await context.route("**/*", (route) => new URL(route.request().url()).hostname === "127.0.0.1"
    ? route.continue()
    : route.fulfill({ status: 200, contentType: route.request().resourceType() === "script" ? "text/javascript" : "text/html", body: "" }));
  // Never send test traffic to Google; the dataLayer contract is what the site owns.
  await context.route(/^https:\/\/(?:[^/]+\.)?(?:googletagmanager|google-analytics)\.com\//, (route) =>
    route.fulfill({ status: 200, contentType: "text/javascript", body: "" }));
});

test.describe("with a GTM container configured", () => {
  test.skip(!gtmId, "Run with NEXT_PUBLIC_GTM_ID=GTM-TEST on both the server build and the test runner.");

  test("home loads the container and initializes the dataLayer", async ({ page }) => {
    const response = await page.goto("/ko");
    await expect(page.locator("script#_next-gtm")).toHaveAttribute("src", new RegExp(`googletagmanager\\.com/gtm\\.js\\?id=${gtmId}`));
    await waitForEntry(page, { event: "gtm.js" });
    const consent = await page.evaluate(() => {
      const layer = (window as unknown as { dataLayer: Record<string, unknown>[] }).dataLayer;
      return { index: layer.findIndex(entry => entry?.[0] === "consent"), init: layer.findIndex(entry => entry?.event === "gtm.js"), value: layer.find(entry => entry?.[0] === "consent")?.[2] };
    });
    expect(consent.index).toBeGreaterThanOrEqual(0);
    expect(consent.index).toBeLessThan(consent.init);
    expect(consent.value).toEqual({ ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied", analytics_storage: "denied" });
    const policy = response?.headers()["content-security-policy"] ?? "";
    expect(policy).toContain("https://www.google.com/g/collect");
    expect(policy).not.toContain("'unsafe-eval'");
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

  test("checkout tracks the resolved product rather than the requested kind", async ({ page }) => {
    await page.goto("/en/checkout?variant=analytics-test-variant&quantity=2&kind=meetup");
    await waitForEntry(page, { event: "begin_checkout", kind: "goods", item_id: "analytics-test-variant", quantity: 2, locale: "en" });
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
    let settled = false;
    await page.route("**/api/payments/analytics-payment/status", (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ data: {
      id: "analytics-payment", orderId: "analytics-order", provider: "LNURL", mode: "REVIEW", status: settled ? "PAID" : "PENDING", amountSats: "52000", currency: "BTC", expiresAt: future,
      checkoutUrl: null, paymentRequest: null, confirmationCode: code, review: false, creationUnknown: false, reviewReason: null,
    } }) }));
    await page.route("**/api/orders/analytics-order", (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ data: {
      id: "analytics-order", amountSats: "52000", amountKrw: "78000", customerName: "Test", customerEmail: "buyer@example.invalid", customerPhone: "", holdExpiresAt: null,
      createdAt: future, payments: [], status: "PAID", fulfillment: "PICKUP", fulfillmentStatus: "UNFULFILLED", address: null, shippingAmountSats: "0", carrier: null, trackingNumber: null,
      items: [{ sku: "MEETUP-7", titleKo: "테스트 밋업", titleEn: "Test meetup", optionLabelKo: "", optionLabelEn: "", quantity: 1, amountSats: "52000" }],
    } }) }));
    await page.goto("/ko/payments/analytics-payment");
    await expect(page.getByRole("heading", { name: "결제 대기" })).toBeVisible();
    settled = true;
    await page.getByRole("button", { name: "상태 다시 확인" }).click();
    await page.waitForURL(`**/ko/orders/confirm/${code}`);
    await expect(page.locator("script#_next-gtm")).toHaveCount(0);
    const log = await page.evaluate(() => JSON.parse(sessionStorage.getItem("analytics_test_log") ?? "[]") as Record<string, unknown>[]);
    expect(log.filter((entry) => entry.event === "purchase")).toEqual([{
      event: "purchase", order_id: "analytics-order", transaction_id: "analytics-order", locale: "ko", kind: "meetup", item_name: "테스트 밋업", amount_sats: "52000", value: 78000, currency: "KRW", eventTimeout: 1000,
    }]);
    expect(await page.evaluate(() => sessionStorage.getItem("ga_purchase_analytics-order"))).toBe("1");
  });

  test("the bearer confirmation page never loads the container", async ({ page }) => {
    await page.goto("/ko/orders/confirm/0123456789abcdef01234567");
    await expect(page.locator("script#_next-gtm")).toHaveCount(0);
    expect(await page.evaluate(() => document.querySelector('meta[name="referrer"]')?.getAttribute("content"))).toBe("no-referrer");
  });

  test("admin screens never load the container", async ({ page }) => {
    const response = await page.goto("/ko/admin");
    await expect(page.locator("script#_next-gtm, script#bcs-analytics-consent")).toHaveCount(0);
    expect(response?.headers()["content-security-policy"]).not.toContain("https://www.google.com/g/collect");
  });

  test("an unsupported locale never exposes a private path to tags", async ({ page }) => {
    for (const pathname of [`/fr-CA/orders/confirm/${code}`, `/fr-CA/orders/%63onfirm/${code}`, "/fr-CA/%61dmin"]) {
      const response = await page.goto(pathname);
      await expect(page.locator("script#_next-gtm")).toHaveCount(0);
      expect(response?.headers()["content-security-policy"]).not.toContain("google-analytics.com");
      expect(response?.headers()["referrer-policy"]).toBe("no-referrer");
    }
  });

  test("confirmation to public navigation reloads without leaking its code", async ({ page }) => {
    const code = "0123456789abcdef01234567";
    const response = await page.goto(`/ko/orders/confirm/${code}`);
    expect(response?.headers()["referrer-policy"]).toBe("no-referrer");
    expect(response?.headers()["content-security-policy"]).not.toContain("google-analytics.com");
    const loaded = page.waitForEvent("domcontentloaded");
    await page.locator(".event-back").click();
    await loaded;
    await page.waitForURL("**/ko");
    await expect(page.locator("script#_next-gtm")).toHaveCount(1);
    expect(await page.evaluate(() => document.referrer)).toBe("");
  });

  test("cart checkout tracks its resolved lines", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("center-cart", JSON.stringify({ v: 1, items: [{ variantId: "analytics-test-variant", quantity: 2 }] })));
    await page.goto("/ko/cart");
    await page.goto("/ko/checkout");
    const entry = await waitForEntry(page, { event: "begin_checkout", item_id: "analytics-test-variant", quantity: 2, locale: "ko" });
    expect(entry.items).toEqual([{ item_id: "analytics-test-variant", item_name: "분석 테스트 상품", quantity: 2 }]);
  });

  test("reopening an already paid payment never counts a new purchase", async ({ page }) => {
    await recordEntries(page);
    await page.route("**/api/payments/analytics-payment/status", (route) => route.fulfill({ json: { data: paidPayment } }));
    await page.goto("/ko/payments/analytics-payment");
    await page.waitForURL(`**/ko/orders/confirm/${code}`);
    const entries = await page.evaluate(() => JSON.parse(sessionStorage.getItem("analytics_test_log") ?? "[]") as Entry[]);
    expect(entries.filter((entry) => entry.event === "purchase")).toHaveLength(0);
  });

  test("a failed order read still opens confirmation without an incomplete purchase", async ({ page }) => {
    await recordEntries(page);
    await page.addInitScript(() => sessionStorage.setItem("ga_purchase_flow_analytics-order", "1"));
    await page.route("**/api/payments/analytics-payment/status", (route) => route.fulfill({ json: { data: paidPayment } }));
    await page.route("**/api/orders/analytics-order", (route) => route.fulfill({ status: 503, json: { error: { code: "UNAVAILABLE" } } }));
    await page.goto("/ko/payments/analytics-payment");
    await page.waitForURL(`**/ko/orders/confirm/${code}`);
    const entries = await page.evaluate(() => JSON.parse(sessionStorage.getItem("analytics_test_log") ?? "[]") as Entry[]);
    expect(entries.filter((entry) => entry.event === "purchase")).toHaveLength(0);
    expect(await page.evaluate(() => sessionStorage.getItem("ga_purchase_analytics-order"))).toBeNull();
  });

  test("free registration tracks once and completes when tag code throws", async ({ page }) => {
    const product = { id: "free-event", slug: "meetup-free", titleKo: "무료 밋업", titleEn: "Free meetup", descriptionKo: "", descriptionEn: "", imageUrl: "", contentFormat: "PLAIN", priceKind: "FREE", priceAmount: "0", memberOnly: false, allowedFulfillments: ["PICKUP"], variants: [{ id: "free-option", sku: "MEETUP-99", optionLabelKo: "", optionLabelEn: "", availableStock: 10 }] };
    const quote = { id: "free-quote", amountSats: "0", amountKrw: "0", expiresAt: "2030-01-01T00:00:00Z", snapshot: { items: [{titleKo: "무료 밋업", titleEn: "Free meetup", optionLabelKo: "", optionLabelEn: "", quantity: 1, amountSats: "0"}], shippingAmountSats: "0", amountSats: "0", shipping: { countryCode: null, requiresPostalCode: false } } };
    await page.route("**/api/products?variant=free-option", (route) => route.fulfill({ json: { data: [product] } }));
    await page.route("**/api/orders/quote", (route) => route.fulfill({ json: { data: quote } }));
    await page.route("**/api/orders", (route) => route.fulfill({ json: { data: { id: "free-order" } } }));
    await page.goto("/ko/checkout?variant=free-option&quantity=1&kind=meetup");
    await expect(page.getByRole("button", { name: "무료 신청 확정" })).toBeEnabled();
    await page.locator("#customer-name").fill("Fixture Guest");
    await page.locator("#customer-email").fill("fixture@example.invalid");
    await page.locator("#checkout-acceptance").check();
    await page.evaluate(() => {
      const target = window as unknown as { dataLayer: unknown[] };
      target.dataLayer.push = () => { throw new Error("synthetic tag failure"); };
    });
    await page.getByRole("button", { name: "무료 신청 확정" }).click();
    await page.waitForURL("**/ko/orders/free-order");
    expect(await page.evaluate(() => sessionStorage.getItem("ga_purchase_free-order"))).toBeNull();
  });

  test("a successful free registration emits a zero-KRW purchase once", async ({ page }) => {
    await recordEntries(page);
    const product = { id: "free-event", slug: "meetup-free", titleKo: "무료 밋업", titleEn: "Free meetup", descriptionKo: "", descriptionEn: "", imageUrl: "", contentFormat: "PLAIN", priceKind: "FREE", priceAmount: "0", memberOnly: false, allowedFulfillments: ["PICKUP"], variants: [{ id: "free-option", sku: "MEETUP-99", optionLabelKo: "", optionLabelEn: "", availableStock: 10 }] };
    const quote = { id: "free-quote", amountSats: "0", amountKrw: "0", expiresAt: "2030-01-01T00:00:00Z", snapshot: { items: [{titleKo: "무료 밋업", titleEn: "Free meetup", optionLabelKo: "", optionLabelEn: "", quantity: 1, amountSats: "0"}], shippingAmountSats: "0", amountSats: "0", shipping: { countryCode: null, requiresPostalCode: false } } };
    await page.route("**/api/products?variant=free-option", (route) => route.fulfill({ json: { data: [product] } }));
    await page.route("**/api/orders/quote", (route) => route.fulfill({ json: { data: quote } }));
    await page.route("**/api/orders", (route) => route.fulfill({ json: { data: { id: "free-order" } } }));
    await page.goto("/ko/checkout?variant=free-option&quantity=1&kind=meetup");
    await expect(page.getByRole("button", { name: "무료 신청 확정" })).toBeEnabled();
    await page.locator("#customer-name").fill("Fixture Guest");
    await page.locator("#customer-email").fill("fixture@example.invalid");
    await page.locator("#checkout-acceptance").check();
    await page.getByRole("button", { name: "무료 신청 확정" }).click();
    await page.waitForURL("**/ko/orders/free-order");
    const entries = await page.evaluate(() => JSON.parse(sessionStorage.getItem("analytics_test_log") ?? "[]") as Entry[]);
    expect(entries.filter((entry) => entry.event === "purchase")).toEqual([{event: "purchase", order_id: "free-order", transaction_id: "free-order", locale: "ko", kind: "meetup", item_name: "무료 밋업", amount_sats: "0", value: 0, currency: "KRW", eventTimeout: 1000}]);
    await page.reload();
    const after = await page.evaluate(() => JSON.parse(sessionStorage.getItem("analytics_test_log") ?? "[]") as Entry[]);
    expect(after.filter((entry) => entry.event === "purchase")).toHaveLength(1);
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
