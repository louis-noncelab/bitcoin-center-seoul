import assert from "node:assert/strict";
import test from "node:test";

const { buildPaymentLetter } = await import("../src/server/email/payment-letter.ts");

const base = {
  id: "order-test",
  status: "PAID",
  amountSats: 1000n,
  amountKrw: 1500n,
  confirmationCode: "confirmation",
  fulfillment: "PICKUP",
  items: [{ titleKo: "책", titleEn: "Book", quantity: 1, sku: "BOOK" }],
};

for (const [name, order, joins, ko, en] of [
  ["pickup", base, [], /수령 준비|수령 가능/, /pickup.*ready|ready.*pickup/i],
  ["domestic delivery", { ...base, fulfillment: "DOMESTIC" }, [], /국내 배송/, /delivery in Korea/i],
  ["international delivery", { ...base, fulfillment: "INTERNATIONAL" }, [], /해외 배송/, /international shipping/i],
  ["in-person meetup", { ...base, items: [{ ...base.items[0], sku: "MEETUP-7" }] }, [], /참여|장소/, /meetup|location/i],
  ["online meetup", { ...base, items: [{ ...base.items[0], sku: "MEETUP-7" }] }, [{ url: "https://meet.example.invalid/7", note: "준비물", noteEn: "Bring notes" }], /온라인 참여/, /join online/i],
  ["mixed delivery and online meetup", { ...base, fulfillment: "DOMESTIC", items: [...base.items, { titleKo: "밋업", titleEn: "Meetup", quantity: 1, sku: "MEETUP-7" }] }, [{ url: "https://meet.example.invalid/7", note: "준비물", noteEn: "Bring notes" }], /국내 배송.*온라인 참여/s, /delivery in Korea.*join online/is],
]) {
  test(`paid letter matches ${name} fulfillment`, () => {
    // Given a paid order with a specific way to receive it.
    for (const [locale, expected] of [["ko", ko], ["en", en]]) {
      // When the customer letter is built.
      const letter = buildPaymentLetter(locale, "order.paid", order, `https://example.invalid/${locale}/orders/confirm/confirmation`, "SATS", "https://example.invalid", joins);
      // Then its plain and HTML copies give matching instructions without an unconditional center visit.
      assert.match(letter.text, expected);
      assert.match(letter.html, expected);
      if (name === "mixed delivery and online meetup" && locale === "ko") {
        assert.match(letter.text, /책 · 1개/);
        assert.match(letter.text, /밋업 · 1명/);
      }
      if (name !== "pickup") {
        assert.doesNotMatch(letter.text, /센터에서 아래 확인 페이지를 보여 주세요|Show the confirmation page at the center/);
        assert.doesNotMatch(letter.html, /센터에서 아래 확인 페이지를 보여 주세요|Show the confirmation page at the center/);
      }
    }
  });
}
