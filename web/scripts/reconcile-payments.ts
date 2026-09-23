// Releases stock and settles payments that no browser or webhook came back for.
//
// A customer who closes the tab, or a webhook Zaprite could not deliver, would otherwise leave a
// payment pending and its stock reserved forever. This walks payments by immutable id so a stuck
// row cannot starve newer ones, and re-reads each from the provider through the same parser the
// webhook uses.
//
//   node --env-file=/etc/bitcoin-center-seoul/commerce.env --conditions=react-server --import=tsx scripts/reconcile-payments.ts --watch
//
// A payment update queues customer and operator mail. This loop waits for that drain to finish
// before it sleeps or disconnects. Retries and rows left PENDING run in scripts/email-queue.ts.
import { setTimeout as delay } from "node:timers/promises";
import { prisma } from "@/server/db";
import { flushEmailDelivery } from "@/server/email/queue";
import { runPaymentMaintenancePass } from "@/server/payments/maintenance";
import { runPrivacyRetentionPass } from "@/server/privacy-retention";
import { cleanExpiredPrivacyRecords } from "@/server/privacy-retention-cleanup";

const intervalMs = 30_000;

async function main() {
  const args = process.argv.slice(2);
  const usage = "Usage: reconcile-payments.ts [--watch|--help]";
  if (args.length === 1 && args[0] === "--help") {
    console.info(usage);
    return;
  }
  if (args.length > 1 || args.some((value) => value !== "--watch")) {
    console.error(usage);
    process.exitCode = 1;
    return;
  }
  const watch = args.includes("--watch");
  const stop = new AbortController();
  const shutdown = () => stop.abort();
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
  let cursor: string | null = null;
  let privacyCursor: string | null = null;
  let nextPrivacyAt = 0;
  try {
    do {
      try {
        const result = await runPaymentMaintenancePass({ afterId: cursor, signal: stop.signal });
        await flushEmailDelivery();
        cursor = result.nextCursor;
        // Fixed event names and counts only: never provider URLs, credentials or customer data.
        console.info(JSON.stringify({
          event: "maintenance.pass",
          checked: result.checked,
          unavailable: result.unavailable,
          requiresReconciliation: result.requiresReconciliation,
          cycleComplete: cursor === null,
        }));
      } catch {
        await flushEmailDelivery().catch(() => undefined);
        console.error("maintenance.pass_failed");
        if (!watch) { process.exitCode = 1; break; }
      }
      if (!stop.signal.aborted && Date.now() >= nextPrivacyAt) {
        try {
          const retention = await runPrivacyRetentionPass({ apply: true, afterId: privacyCursor });
          const cleanup = await cleanExpiredPrivacyRecords({ apply: true });
          privacyCursor = retention.nextCursor;
          if (privacyCursor === null && !cleanup.more) nextPrivacyAt = Date.now() + 86_400_000;
          console.info(JSON.stringify({ event: "privacy.maintenance", orders: retention.orders,
            archives: cleanup.archives, emails: cleanup.emails, quotes: cleanup.quotes,
            cycleComplete: privacyCursor === null && !cleanup.more }));
        } catch {
          console.error("privacy.maintenance_failed");
          nextPrivacyAt = Date.now() + 60_000;
        }
      }
      if (stop.signal.aborted || (!watch && cursor === null)) break;
      if (watch) {
        try { await delay(intervalMs, undefined, { signal: stop.signal }); }
        catch (error) { if (!stop.signal.aborted) throw error; }
      }
    } while (!stop.signal.aborted);
  } finally {
    process.off("SIGTERM", shutdown);
    process.off("SIGINT", shutdown);
    await flushEmailDelivery().catch(() => undefined);
    await prisma.$disconnect();
  }
}

main().catch(() => { console.error("maintenance.stopped_unexpectedly"); process.exitCode = 1; });
