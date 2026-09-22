// Drains EmailOutbox. Capture mode records mail and this process sends nothing.
// SMTP mode claims PENDING rows, sends them, and retries failures with a pause.
//
//   node --env-file=/etc/bitcoin-center-seoul/commerce.env --conditions=react-server --import=tsx scripts/email-queue.ts --watch
import { setTimeout as delay } from "node:timers/promises";
import { ServerConfigError, getServerConfig } from "@/server/config";
import { prisma } from "@/server/db";
import { processEmailQueue } from "@/server/email/queue";

const intervalMs = 30_000;

async function main() {
  const args = process.argv.slice(2);
  const usage = "Usage: email-queue.ts [--watch|--help]";
  if (args.length === 1 && args[0] === "--help") {
    console.info(usage);
    return;
  }
  if (args.length > 1 || args.some((value) => value !== "--watch")) {
    console.error(usage);
    process.exitCode = 1;
    return;
  }
  try {
    getServerConfig();
  } catch (error) {
    const fields = error instanceof ServerConfigError ? error.fields.join(",") : "unknown";
    console.error(`email.config_invalid ${fields}`);
    process.exitCode = 1;
    return;
  }
  const watch = args.includes("--watch");
  const stop = new AbortController();
  const shutdown = () => stop.abort();
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
  try {
    do {
      if (stop.signal.aborted) break;
      try {
        const result = await processEmailQueue();
        console.info(JSON.stringify({
          event: "email.pass",
          claimed: result.claimed,
          sent: result.sent,
          failed: result.failed,
          skipped: result.skipped,
        }));
      } catch (error) {
        console.error(error instanceof Error ? `email.pass_failed ${error.name}` : "email.pass_failed");
        if (!watch) { process.exitCode = 1; break; }
      }
      if (stop.signal.aborted || !watch) break;
      try { await delay(intervalMs, undefined, { signal: stop.signal }); }
      catch (error) { if (!stop.signal.aborted) throw error; }
    } while (!stop.signal.aborted);
  } finally {
    process.off("SIGTERM", shutdown);
    process.off("SIGINT", shutdown);
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? `email.stopped ${error.name}` : "email.stopped");
  process.exitCode = 1;
});
