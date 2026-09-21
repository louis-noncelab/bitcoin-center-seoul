// Releases stock and settles payments that no browser or webhook came back for.
//
// A customer who closes the tab, or a webhook Zaprite could not deliver, would otherwise leave a
// payment pending and its stock reserved forever. This walks payments by immutable id so a stuck
// row cannot starve newer ones, and re-reads each from the provider through the same parser the
// webhook uses.
//
//   set -a && . ./.env.local && set +a && npm run payments:reconcile -- --watch
//
// Email delivery is deliberately not part of this worker: EMAIL_MODE is capture and operational
// mail is out of scope, so the outbox is written but never sent.
import { setTimeout as delay } from "node:timers/promises";
import { prisma } from "@/server/db";
import { runPaymentMaintenancePass } from "@/server/payments/maintenance";

const intervalMs = 30_000;

async function main() {
  const args = process.argv.slice(2);
  if (args.some((value) => value !== "--watch")) {
    console.error("Usage: reconcile-payments.ts [--watch]");
    process.exitCode = 1;
    return;
  }
  const watch = args.includes("--watch");
  const stop = new AbortController();
  const shutdown = () => stop.abort();
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
  let cursor: string | null = null;
  try {
    do {
      try {
        const result = await runPaymentMaintenancePass({ afterId: cursor, signal: stop.signal });
        cursor = result.nextCursor;
        // Fixed event names and counts only: never provider URLs, credentials or customer data.
        console.info(JSON.stringify({
          event: "maintenance.pass",
          checked: result.checked,
          unavailable: result.unavailable,
          cycleComplete: cursor === null,
        }));
      } catch {
        console.error("maintenance.pass_failed");
        if (!watch) { process.exitCode = 1; break; }
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
    await prisma.$disconnect();
  }
}

main().catch(() => { console.error("maintenance.stopped_unexpectedly"); process.exitCode = 1; });
