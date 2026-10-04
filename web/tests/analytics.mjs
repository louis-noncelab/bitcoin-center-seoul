import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { orderKind, orderValueKrw, trackEvent, trackPurchaseOnce } from "../src/lib/analytics.ts";

function fakeWindow() {
  const store = new Map();
  globalThis.window = {
    sessionStorage: {
      getItem: (key) => store.has(key) ? store.get(key) : null,
      setItem: (key, value) => { store.set(key, String(value)); },
    },
  };
  return globalThis.window;
}

afterEach(() => { delete globalThis.window; });

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
});

test("trackEvent is a no-op without a window and appends to dataLayer in the browser", () => {
  assert.doesNotThrow(() => trackEvent("collab_submit", { locale: "ko" }));
  const browser = fakeWindow();
  trackEvent("collab_submit", { locale: "ko" });
  trackEvent("outbound_click", { destination: "x", locale: "en" });
  assert.deepEqual(browser.dataLayer, [{ event: "collab_submit", locale: "ko" }, { event: "outbound_click", destination: "x", locale: "en" }]);
});

test("trackPurchaseOnce sends one purchase per order and session", () => {
  const browser = fakeWindow();
  trackPurchaseOnce({ orderId: "order-1", locale: "ko", kind: "meetup", value: 0, itemName: "밋업" });
  trackPurchaseOnce({ orderId: "order-1", locale: "ko", kind: "meetup", value: 0, itemName: "밋업" });
  trackPurchaseOnce({ orderId: "order-2", locale: "en" });
  assert.deepEqual(browser.dataLayer, [
    { event: "purchase", order_id: "order-1", transaction_id: "order-1", locale: "ko", kind: "meetup", item_name: "밋업", value: 0, currency: "KRW" },
    { event: "purchase", order_id: "order-2", transaction_id: "order-2", locale: "en" },
  ]);
  assert.equal(browser.sessionStorage.getItem("ga_purchase_order-1"), "1");
});
