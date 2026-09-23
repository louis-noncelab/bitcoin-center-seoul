import { parseArgs } from "node:util";
import { z } from "zod";
import { prisma, disconnectDatabase } from "@/server/db";
import { runPrivacyRetentionPass } from "@/server/privacy-retention";
import { cleanExpiredPrivacyRecords } from "@/server/privacy-retention-cleanup";

const usage = "Usage: privacy-retention.ts [--apply] [--order ID [--early]] [--hold ID|--release-hold ID] [--help]";

async function main() {
  const { values } = parseArgs({ options: {
    apply: { type: "boolean", default: false }, order: { type: "string" }, early: { type: "boolean", default: false },
    hold: { type: "string" }, "release-hold": { type: "string" }, help: { type: "boolean" },
  } });
  if (values.help) { console.info(usage); return; }
  const id = z.string().min(1).max(128);
  const orderId = values.order ? id.parse(values.order) : undefined;
  const holdId = values.hold ? id.parse(values.hold) : values["release-hold"] ? id.parse(values["release-hold"]) : undefined;
  if ((values.early && !orderId) || (holdId && (orderId || values.early)) || (values.hold && values["release-hold"])) throw new RangeError(usage);
  if (holdId) {
    const exists = await prisma.order.count({ where: { id: holdId } });
    if (!exists) throw new RangeError("Order does not exist.");
    if (values.apply) await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${holdId} FOR UPDATE`;
      await tx.order.update({ where: { id: holdId }, data: { privacyHold: Boolean(values.hold) } });
      await tx.auditLog.create({ data: { action: values.hold ? "privacy.hold.set" : "privacy.hold.released", targetType: "Order", targetId: holdId, summary: {} } });
    });
    console.info(JSON.stringify({ event: "privacy.hold", apply: values.apply, held: Boolean(values.hold), orders: 1 }));
    return;
  }
  const now = new Date();
  let cursor: string | null = null;
  let complete = false;
  let orders = 0; let archives = 0; let emails = 0; let quotes = 0;
  for (let batch = 0; batch < 100; batch += 1) {
    const result = await runPrivacyRetentionPass({ apply: values.apply, early: values.early, ...(orderId ? { orderId } : {}), afterId: cursor, now });
    orders += result.orders;
    cursor = result.nextCursor;
    if (orderId || cursor === null) { complete = true; break; }
  }
  if (!orderId) {
    for (let batch = 0; batch < (values.apply ? 100 : 1); batch += 1) {
      const result = await cleanExpiredPrivacyRecords({ apply: values.apply, now });
      archives += result.archives; emails += result.emails; quotes += result.quotes;
      if (!result.more) break;
      if (!values.apply || batch === 99) complete = false;
    }
  }
  console.info(JSON.stringify({ event: "privacy.retention", apply: values.apply, orders, archives, emails, quotes, complete }));
  if (!complete) process.exitCode = 2;
}

main().catch(() => { console.error("privacy.retention_failed"); process.exitCode = 1; })
  .finally(disconnectDatabase);
