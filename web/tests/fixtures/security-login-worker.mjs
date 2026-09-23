import { login } from "../../src/server/events/auth.ts";
import { prisma } from "../../src/server/db.ts";
process.send({ ready: true });
process.once("message", async ({ clientKey, attempts }) => {
  const statuses = [];
  try {
    for (let i = 0; i < attempts; i++) {
      try { await login("invalid-password", clientKey); statuses.push(200); }
      catch (error) { statuses.push(error.status ?? 500); }
    }
    process.send({ statuses });
  } finally { await prisma.$disconnect(); process.disconnect(); }
});
