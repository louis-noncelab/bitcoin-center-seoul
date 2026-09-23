import assert from "node:assert/strict";
import test from "node:test";
import nodemailer from "nodemailer";

test("SMTP composer retains the application's bilingual letter fields without network access", async () => {
  // Given the same explicit message fields used by the outbox sender.
  const transport = nodemailer.createTransport({ streamTransport: true, buffer: true });
  // When composing a Korean/English message entirely in memory.
  const result = await transport.sendMail({
    from: "비트코인 센터 서울 <center@example.invalid>",
    to: "visitor@example.invalid",
    replyTo: "help@example.invalid",
    subject: "주문 확인 / Order confirmation",
    text: "주문이 접수되었습니다. Your order is confirmed.",
    html: "<p>주문이 접수되었습니다. Your order is confirmed.</p>",
  });
  // Then envelope addressing and both content representations survive the upgrade.
  assert.deepEqual(result.envelope, { from: "center@example.invalid", to: ["visitor@example.invalid"] });
  assert.ok(Buffer.isBuffer(result.message));
  const message = result.message.toString("utf8");
  assert.match(message, /Reply-To: help@example\.invalid/);
  assert.match(message, /Content-Type: multipart\/alternative/);
  assert.match(message, /Content-Type: text\/plain; charset=utf-8/);
  assert.match(message, /Content-Type: text\/html; charset=utf-8/);
});
