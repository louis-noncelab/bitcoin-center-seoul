import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { isPrivateAnalyticsPath } from "../src/lib/analytics-path.ts";
import { beginPurchaseFlow, endPurchaseFlow, purchaseFlowActive, orderKind, orderValueKrw, trackEvent, trackPurchaseOnce } from "../src/lib/analytics.ts";

function fakeWindow(shared = new Map()) {
  const storage = (store) => ({
    getItem: (key) => store.has(key) ? store.get(key) : null,
    setItem: (key, value) => { store.set(key, String(value)); },
    removeItem: (key) => { store.delete(key); },
  });
  globalThis.window = {
    sessionStorage: storage(new Map()),
    localStorage: storage(shared),
  };
  return globalThis.window;
}

afterEach(() => { delete globalThis.window; });

test("private analytics paths include encoded and unsupported-locale segments", () => {
  for (const pathname of ["/ko/admin", "/en/orders/confirm/code", "/fr-CA/orders/%63onfirm/code", "/ko/%61dmin", "/orders/confirm/code", "/bad%route"]) {
    assert.equal(isPrivateAnalyticsPath(pathname), true, pathname);
  }
  assert.equal(isPrivateAnalyticsPath("/ko/shop"), false);
  assert.equal(isPrivateAnalyticsPath("/en/programs/admin-lesson"), false);
});

test("a busy purchase lock skips optional tracking without waiting", async () => {
  const browser = fakeWindow();
  browser.navigator = { locks: { request: async (name, options, callback) => {
    assert.equal(name, "ga_purchase_busy");
    assert.deepEqual(options, { ifAvailable: true });
    return callback(null);
  } } };
  await trackPurchaseOnce({ orderId: "busy", locale: "ko", value: 0 });
  assert.equal(browser.dataLayer, undefined);
  assert.equal(browser.localStorage.getItem("ga_purchase_busy"), null);
});

test("orderKind treats MEETUP- SKUs as meetups and everything else as goods", () => {
  assert.equal(orderKind(["MEETUP-12"]), "meetup");
  assert.equal(orderKind(["TSHIRT-M", "MEETUP-3"]), "meetup");
  assert.equal(orderKind(["TSHIRT-M"]), "goods");
  assert.equal(orderKind([undefined]), "goods");
  assert.equal(orderKind([]), "goods");
});

test("orderValueKrw converts stored KRW, keeps free registrations at 0 and omits unknown amounts", () => {
  assert.equal(orderValueKrw("125000", "100000"), 125000);
  assert.equal(orderValueKrw("0", "0"), 0);
  assert.equal(orderValueKrw(null, "0"), 0);
  assert.equal(orderValueKrw(undefined, "0"), 0);
  assert.equal(orderValueKrw(null, "52000"), undefined);
  assert.equal(orderValueKrw("not-a-number", "52000"), undefined);
  assert.equal(orderValueKrw("9007199254740992", "52000"), undefined);
});

test("trackEvent is a no-op without a window and appends to dataLayer in the browser", () => {
  assert.doesNotThrow(() => trackEvent("collab_submit", { locale: "ko" }));
  const browser = fakeWindow();
  trackEvent("collab_submit", { locale: "ko" });
  trackEvent("outbound_click", { destination: "x", locale: "en" });
  assert.deepEqual(browser.dataLayer, [{ event: "collab_submit", locale: "ko" }, { event: "outbound_click", destination: "x", locale: "en" }]);
});

test("analytics strips word joiners from labels without changing display data or identifiers", () => {
  const browser = fakeWindow();
  const name = "\u2060센터\u2060 상품\u2060 👩‍💻";
  const item = Object.freeze({ item_id: "sku\u2060-one", item_name: name, quantity: 2 });
  const items = Object.freeze([item]);
  const params = Object.freeze({ item_id: item.item_id, item_name: name, page_title: `${name} | Center`, items, quantity: 2, locale: "ko" });
  trackEvent("view_item", params);
  trackEvent("begin_checkout", { items, value: 0 });
  assert.deepEqual(browser.dataLayer, [
    { event: "view_item", item_id: item.item_id, item_name: "센터 상품 👩‍💻", page_title: "센터 상품 👩‍💻 | Center", items: [{ ...item, item_name: "센터 상품 👩‍💻" }], quantity: 2, locale: "ko" },
    { event: "begin_checkout", items: [{ ...item, item_name: "센터 상품 👩‍💻" }], value: 0 },
  ]);
  assert.equal(params.item_name, name);
  assert.equal(items[0].item_name, name);
});

test("purchase labels are cleaned while purchase deduplication stays intact", async () => {
  const browser = fakeWindow();
  await trackPurchaseOnce({ orderId: "clean-label-order", locale: "ko", itemName: "비트\u2060코인\u2060 밋업", value: 0 });
  await trackPurchaseOnce({ orderId: "clean-label-order", locale: "ko", itemName: "비트코인 밋업", value: 0 });
  assert.deepEqual(browser.dataLayer, [{ event: "purchase", order_id: "clean-label-order", transaction_id: "clean-label-order", locale: "ko", item_name: "비트코인 밋업", value: 0, currency: "KRW" }]);
});

test("trackPurchaseOnce sends one purchase per order and session", async () => {
  const browser = fakeWindow();
  await trackPurchaseOnce({ orderId: "order-1", locale: "ko", kind: "meetup", value: 0, itemName: "밋업" });
  await trackPurchaseOnce({ orderId: "order-1", locale: "ko", kind: "meetup", value: 0, itemName: "밋업" });
  await trackPurchaseOnce({ orderId: "order-2", locale: "en" });
  assert.deepEqual(browser.dataLayer, [
    { event: "purchase", order_id: "order-1", transaction_id: "order-1", locale: "ko", kind: "meetup", item_name: "밋업", value: 0, currency: "KRW" },
    { event: "purchase", order_id: "order-2", transaction_id: "order-2", locale: "en" },
  ]);
  assert.equal(browser.sessionStorage.getItem("ga_purchase_order-1"), "1");
});

test("a completed purchase is not emitted in another tab", async () => {
  const shared = new Map();
  fakeWindow(shared);
  await trackPurchaseOnce({ orderId: "shared-order", locale: "ko" });
  const nextTab = fakeWindow(shared);
  await trackPurchaseOnce({ orderId: "shared-order", locale: "ko" });
  assert.equal(nextTab.dataLayer, undefined);
});

test("blocked storage still deduplicates in the current document", async () => {
  const browser = fakeWindow();
  const blocked = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); }, removeItem() { throw new Error("blocked"); } };
  browser.sessionStorage = blocked;
  browser.localStorage = blocked;
  beginPurchaseFlow("private-order");
  assert.equal(purchaseFlowActive("private-order"), true);
  await Promise.all([trackPurchaseOnce({ orderId: "private-order", locale: "ko" }), trackPurchaseOnce({ orderId: "private-order", locale: "ko" })]);
  assert.equal(browser.dataLayer.length, 1);
  assert.equal(purchaseFlowActive("private-order"), false);
});

test("failed tags cannot throw or mark an undelivered purchase as complete", async () => {
  const browser = fakeWindow();
  browser.dataLayer = { push() { throw new Error("tag failure"); } };
  assert.equal(trackEvent("collab_submit", { locale: "ko" }), false);
  await assert.doesNotReject(trackPurchaseOnce({ orderId: "failed-order", locale: "ko" }));
  assert.equal(browser.localStorage.getItem("ga_purchase_failed-order"), null);
  browser.dataLayer = [];
  await trackPurchaseOnce({ orderId: "failed-order", locale: "ko" });
  assert.equal(browser.dataLayer.length, 1);
});

test("flow eligibility is consumed and fixed-satoshi orders keep their exact amount", async () => {
  const browser = fakeWindow();
  assert.equal(purchaseFlowActive("sats-order"), false);
  beginPurchaseFlow("sats-order");
  assert.equal(purchaseFlowActive("sats-order"), true);
  await trackPurchaseOnce({orderId: "sats-order", locale: "en", amountSats: "52000"});
  assert.deepEqual(browser.dataLayer, [{event: "purchase", order_id: "sats-order", transaction_id: "sats-order", locale: "en", amount_sats: "52000"}]);
  assert.equal(purchaseFlowActive("sats-order"), false);
  endPurchaseFlow("sats-order");
});
