// The webhook acknowledges only its own organization and never treats the request body as payment state.
// TEST_DATABASE_URL=postgresql://localhost/center_test npm run test:content
import assert from "node:assert/strict";
import test, { after } from "node:test";

process.env.APP_MODE = "test";
process.env.APP_ORIGIN = "http://127.0.0.1:3100";
assert.ok(process.env.TEST_DATABASE_URL, "Set TEST_DATABASE_URL to a disposable migrated local PostgreSQL database");
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.DATA_DIR = "/tmp";
process.env.TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
process.env.PAYMENT_PROVIDER = "zaprite";
process.env.PAYMENT_MODE = "sandbox";
process.env.EMAIL_MODE = "capture";
process.env.TRUST_PROXY = "false";
process.env.ZAPRITE_API_KEY = "test-key";
process.env.ZAPRITE_WEBHOOK_SECRET = "test-secret";
process.env.ZAPRITE_ORG_ID = "org_test";
process.env.ZAPRITE_API_URL = "https://api.zaprite.com";

const { prisma } = await import("../src/server/db.ts");
const { HttpError } = await import("../src/server/http.ts");
const { processZapriteWebhook } = await import("../src/server/payments/webhook.ts");

const orderId = `od_${Date.now().toString(36)}`;

function delivery(body, token = "test-secret") {
  return new Request(`https://bitcoincenterseoul.com/api/webhooks/zaprite/${token}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

after(async () => {
  await prisma.payment.deleteMany({ where: { externalId: orderId } });
  await prisma.$disconnect();
});

test("a wrong secret, another organization, or an unknown order does not become a payment", async () => {
  await assert.rejects(
    () => processZapriteWebhook(delivery({ eventType: "order.change", orderId, orgId: "org_test" }, "wrong-secret"), "wrong-secret"),
    (error) => error instanceof HttpError && error.status === 401 && error.code === "INVALID_WEBHOOK_SIGNATURE",
  );
  await assert.rejects(
    () => processZapriteWebhook(delivery({ eventType: "order.change", orderId, orgId: "org_other" }), "test-secret"),
    (error) => error instanceof HttpError && error.status === 400 && error.code === "WEBHOOK_ORG_MISMATCH",
  );
  const result = await processZapriteWebhook(delivery({
    eventType: "order.change", orderId, orgId: "org_test", status: "PAID",
  }), "test-secret");
  assert.equal(result.handled, false);
  assert.equal(await prisma.payment.count({ where: { externalId: orderId } }), 0);
});
