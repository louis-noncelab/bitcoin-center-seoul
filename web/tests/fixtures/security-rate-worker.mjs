import { boundedRequestRateLimit } from "../../src/server/auth/rate-limit.ts";
import { prisma } from "../../src/server/db.ts";
process.send({ ready: true });
process.once("message", async ({ ip, action, attempts }) => {
  try {
    const statuses = await Promise.all(Array.from({ length: attempts }, async () => {
      try {
        await boundedRequestRateLimit(new Request("http://127.0.0.1:3197", { headers: { "x-bcs-client-ip": ip } }), action, 2, 5);
        return 200;
      } catch (error) { return error.status ?? 500; }
    }));
    process.send({ statuses });
  } finally { await prisma.$disconnect(); process.disconnect(); }
});
