// Notification failure isolation checks.
//
// Runs against an explicitly selected isolated PostgreSQL database in REVIEW mode, so no
// provider or real notification endpoint is contacted.
import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { randomBytes, randomUUID } from "node:crypto";

assert.ok(process.env.TEST_DATABASE_URL, "Set TEST_DATABASE_URL to a disposable commerce database.");
Object.assign(process.env, {
  APP_MODE: "test",
  APP_ORIGIN: "http://127.0.0.1:3100",
  DATABASE_URL: process.env.TEST_DATABASE_URL,
  DATA_DIR: "/tmp",
  TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
  PAYMENT_PROVIDER: "zaprite",
  PAYMENT_MODE: "review",
  EMAIL_MODE: "capture",
  TRUST_PROXY: "false",
  REVIEW_KRW_PER_BTC: "150000000",
  ZAPRITE_API_KEY: "test-key",
  ZAPRITE_WEBHOOK_SECRET: "test-secret",
  ZAPRITE_ORG_ID: "org_test",
});

const { prisma } = await import("../src/server/db.ts");
const { makeQuote } = await import("../src/server/orders/quote.ts");
const { createOrder } = await import("../src/server/orders/create.ts");
const { checkoutPolicyVersion } = await import("../src/server/orders/checkout-policy.ts");
const { notifyOrder, encryptWebhookUrl } = await import("../src/server/commerce/notifications.ts");
const { applyObservation } = await import("../src/server/payments/state.ts");
const { POST: postOrder } = await import("../src/app/api/orders/route.ts");

const prefix = `notify-${randomBytes(8).toString("hex")}`;
const email = `${prefix}@example.invalid`;
let variantId;
let previousSettings;

before(async () => {
  previousSettings = await prisma.siteSetting.findUnique({ where: { id: "site" } });
  await prisma.siteSetting.upsert({
    where: { id: "site" },
    update: { guestPurchaseAllowed: true, maintenanceMode: false, paymentProvider: "ZAPRITE", btcPriceSource: "UPBIT", notificationWebhook: null },
    create: { id: "site", guestPurchaseAllowed: true, maintenanceMode: false, paymentProvider: "ZAPRITE", btcPriceSource: "UPBIT", notificationWebhook: null },
  });
  const product = await prisma.product.create({
    data: {
      slug: prefix,
      titleKo: "알림 테스트",
      titleEn: "Notification test",
      descriptionKo: "",
      descriptionEn: "",
      published: true,
      priceKind: "BTC_FIXED",
      priceAmount: 1000n,
      allowedFulfillments: ["PICKUP"],
      variants: { create: { sku: prefix, stockOnHand: 20 } },
    },
    include: { variants: true },
  });
  variantId = product.variants[0].id;
});

after(async () => {
  const { customerEmailHash } = await import("../src/server/privacy.ts");
  const orders = await prisma.order.findMany({
    where: { OR: [{ customerEmail: email }, { customerEmailHash: customerEmailHash(email) }] },
    select: { id: true },
  });
  const ids = orders.map(({ id }) => id);
  await prisma.paymentEvent.deleteMany({ where: { payment: { orderId: { in: ids } } } });
  await prisma.payment.deleteMany({ where: { orderId: { in: ids } } });
  await prisma.couponUsage.deleteMany({ where: { orderId: { in: ids } } });
  await prisma.orderItem.deleteMany({ where: { orderId: { in: ids } } });
  await prisma.order.deleteMany({ where: { id: { in: ids } } });
  await prisma.auditLog.deleteMany({ where: { targetId: { in: ids } } });
  await prisma.quote.deleteMany({ where: { snapshot: { path: ["items", "0", "sku"], equals: prefix } } });
  if (ids.length) await prisma.emailOutbox.deleteMany({ where: { OR: ids.map((id) => ({ eventKey: { contains: id } })) } });
  await prisma.productVariant.deleteMany({ where: { sku: prefix } });
  await prisma.product.deleteMany({ where: { slug: prefix } });
  if (previousSettings) {
    await prisma.siteSetting.update({
      where: { id: "site" },
      data: {
        guestPurchaseAllowed: previousSettings.guestPurchaseAllowed,
        maintenanceMode: previousSettings.maintenanceMode,
        paymentProvider: previousSettings.paymentProvider,
        btcPriceSource: previousSettings.btcPriceSource,
        productDisplayUnit: previousSettings.productDisplayUnit,
        notificationChannel: previousSettings.notificationChannel,
        notificationWebhook: previousSettings.notificationWebhook,
      },
    });
  } else {
    await prisma.siteSetting.delete({ where: { id: "site" } });
  }
  await prisma.$disconnect();
});

function guestRequest(secret, key, body) {
  return new Request("http://127.0.0.1:3100/api/orders", {
    method: "POST",
    headers: {
      origin: "http://127.0.0.1:3100",
      "content-type": "application/json",
      "idempotency-key": key,
      "x-request-secret": secret,
    },
    body: JSON.stringify(body),
  });
}

async function quote() {
  return makeQuote({ items: [{ variantId, quantity: 1 }], fulfillment: "PICKUP" }, null);
}

function orderInput(quoteId) {
  return {
    quoteId,
    customer: { name: "Tester", email, phone: "" },
    locale: "en",
    acceptance: { accepted: true, version: checkoutPolicyVersion("en") },
  };
}

async function createFixtureOrder() {
  const { quote: quoted, token } = await quote();
  const request = guestRequest(randomBytes(32).toString("base64url"), randomUUID(), orderInput(quoted.id));
  request.headers.set("cookie", `bcs_quote_${quoted.id}=${token}`);
  return createOrder(request, orderInput(quoted.id), null);
}

function waitForNotificationFailure(expected) {
  const original = console.error;
  let timeout;
  const promise = new Promise((resolve, reject) => {
    timeout = setTimeout(() => {
      console.error = original;
      reject(new Error(`notification failure event was not observed for ${expected.stage}`));
    }, 1000);
    console.error = (...args) => {
      if (args[0] === "commerce.notification.failure") {
        clearTimeout(timeout);
        console.error = original;
        resolve(args[1]);
        return;
      }
      original(...args);
    };
  });
  return promise.then((event) => {
    assert.deepEqual(Object.keys(event).sort(), ["event", "orderId", "reasonCode", "stage"]);
    assert.equal(event.event, "commerce.notification.failure");
    if (expected.orderId !== undefined) assert.equal(event.orderId, expected.orderId);
    assert.equal(event.stage, expected.stage);
    assert.equal(event.reasonCode, expected.reasonCode);
    return event;
  });
}

function withFetch(fetcher) {
  const original = globalThis.fetch;
  globalThis.fetch = fetcher;
  return () => {
    globalThis.fetch = original;
  };
}

test("missing webhook configuration returns before customer decryption", async () => {
  // Given: a real order exists, but its encrypted customer field is unreadable.
  const { order } = await createFixtureOrder();
  await prisma.order.update({ where: { id: order.id }, data: { customerName: "v1.invalid.invalid.invalid" } });
  await prisma.siteSetting.update({ where: { id: "site" }, data: { notificationWebhook: null } });
  const restoreFetch = withFetch(async () => {
    throw new Error("fetch must not run without webhook configuration");
  });
  const original = prisma.order.findUnique;
  let customerLookups = 0;
  prisma.order.findUnique = (...args) => {
    customerLookups += 1;
    return original.apply(prisma.order, args);
  };
  try {
    // When / Then: notification exits before reading customer fields.
    await notifyOrder(order.id, "접수");
    assert.equal(customerLookups, 0);
  } finally {
    prisma.order.findUnique = original;
    restoreFetch();
  }
});

test("notification customer lookup failure is contained and logged safely", async () => {
  // Given a real order and configured notification, only its customer lookup fails.
  const { order } = await createFixtureOrder();
  await prisma.siteSetting.update({ where: { id: "site" }, data: { notificationWebhook: encryptWebhookUrl("https://notify.example.test/hook") } });
  const original = prisma.order.findUnique;
  prisma.order.findUnique = async () => {
    throw new Error("synthetic customer lookup failure");
  };
  const observed = waitForNotificationFailure({ orderId: order.id, stage: "customer_lookup", reasonCode: "ORDER_LOOKUP_FAILED" });
  try {
    // When the notification is requested, then it resolves and emits only the safe fields.
    await notifyOrder(order.id, "접수");
    await observed;
  } finally {
    prisma.order.findUnique = original;
  }
});

test("notification webhook decryption failure is contained and logged safely", async () => {
  // Given a real order and unreadable webhook, when notified, then the safe reason is emitted.
  const { order } = await createFixtureOrder();
  await prisma.siteSetting.update({ where: { id: "site" }, data: { notificationWebhook: "v1.invalid.invalid.invalid" } });
  const observed = waitForNotificationFailure({ orderId: order.id, stage: "settings_lookup", reasonCode: "WEBHOOK_DECRYPT_FAILED" });
  await notifyOrder(order.id, "접수");
  await observed;
});

test("notification setting lookup failure is logged without failing order success", async () => {
  // Given: a real order exists and the notification DB lookup is the only failing seam.
  const { order } = await createFixtureOrder();
  const original = prisma.siteSetting.findUnique;
  prisma.siteSetting.findUnique = async () => {
    throw new Error("synthetic settings failure");
  };
  const observed = waitForNotificationFailure({ orderId: order.id, stage: "settings_lookup", reasonCode: "DB_LOOKUP_FAILED" });
  try {
    // When
    await notifyOrder(order.id, "접수");
    // Then
    await observed;
  } finally {
    prisma.siteSetting.findUnique = original;
  }
});

test("customer decryption failure is logged without leaking submitted values", async () => {
  // Given: notification is configured and a real order customer field is unreadable.
  const { order } = await createFixtureOrder();
  await prisma.siteSetting.update({ where: { id: "site" }, data: { notificationWebhook: encryptWebhookUrl("https://notify.example.test/hook") } });
  await prisma.order.update({ where: { id: order.id }, data: { customerName: "v1.invalid.invalid.invalid" } });
  const observed = waitForNotificationFailure({ orderId: order.id, stage: "customer_decrypt", reasonCode: "CUSTOMER_DECRYPT_FAILED" });
  // When
  await notifyOrder(order.id, "접수");
  // Then
  await observed;
});

test("order route still commits when notification request construction fails", async () => {
  // Given: the actual order API route is used and only the webhook URL is malformed.
  await prisma.siteSetting.update({ where: { id: "site" }, data: { notificationWebhook: encryptWebhookUrl("https://exa mple.invalid/hook") } });
  const { quote: quoted, token } = await quote();
  const request = guestRequest(randomBytes(32).toString("base64url"), randomUUID(), orderInput(quoted.id));
  request.headers.set("cookie", `bcs_quote_${quoted.id}=${token}`);
  const observed = waitForNotificationFailure({ orderId: undefined, stage: "request_build", reasonCode: "REQUEST_BUILD_FAILED" });
  // When
  const response = await postOrder(request);
  const body = await response.json();
  // Then
  assert.equal(response.status, 201);
  const orderId = body.data.id;
  await observed.then((event) => assert.equal(event.orderId, orderId));
  const held = await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } });
  assert.equal(held.reservedStock > 0, true);
});

test("fetch rejection is logged without exposing the webhook target", async () => {
  // Given: a real order is ready to notify and fetch is the only failing seam.
  const { order } = await createFixtureOrder();
  await prisma.siteSetting.update({ where: { id: "site" }, data: { notificationWebhook: encryptWebhookUrl("https://notify.example.test/hook") } });
  const restoreFetch = withFetch(async () => {
    throw new TypeError("synthetic network failure containing https://notify.example.test/hook");
  });
  const observed = waitForNotificationFailure({ orderId: order.id, stage: "delivery", reasonCode: "FETCH_FAILED" });
  try {
    // When
    await notifyOrder(order.id, "접수");
    // Then
    await observed;
  } finally {
    restoreFetch();
  }
});

test("payment settlement remains idempotent when notification receives HTTP failure", async () => {
  // Given: a real pending order payment is settled while the notification receiver returns an error.
  const { order } = await createFixtureOrder();
  const payment = await prisma.payment.findFirstOrThrow({ where: { orderId: order.id } });
  await prisma.siteSetting.update({ where: { id: "site" }, data: { notificationWebhook: encryptWebhookUrl("https://notify.example.test/hook") } });
  const restoreFetch = withFetch(async () => new Response("", { status: 503 }));
  const before = await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } });
  const eventKey = `notify-http:${payment.id}`;
  const observed = waitForNotificationFailure({ orderId: order.id, stage: "delivery", reasonCode: "HTTP_NOT_OK" });
  try {
    // When
    const settled = await applyObservation(payment.id, { status: "PAID" }, eventKey);
    // Then
    assert.equal(settled.status, "PAID");
    await observed;
    const duplicate = await applyObservation(payment.id, { status: "PAID" }, eventKey);
    assert.equal(duplicate.status, "PAID");
    const currentOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    assert.equal(currentOrder.status, "PAID");
    const afterStock = await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } });
    assert.equal(afterStock.stockOnHand, before.stockOnHand - 1);
    assert.equal(afterStock.reservedStock, before.reservedStock - 1);
  } finally {
    restoreFetch();
  }
});
