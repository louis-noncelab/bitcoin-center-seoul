import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "@/generated/prisma/client";
import { getServerConfig } from "@/server/config";

export type Tx = Prisma.TransactionClient;

const globalDatabase = globalThis as typeof globalThis & { centerPrisma?: PrismaClient };

function client(): PrismaClient {
  globalDatabase.centerPrisma ??= new PrismaClient({
    adapter: new PrismaPg({ connectionString: getServerConfig().databaseUrl, max: 10, connectionTimeoutMillis: 5000 }),
  });
  return globalDatabase.centerPrisma;
}

// Next imports route modules during build. Delay configuration and pool creation until actual use.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const database = client();
    const value: unknown = Reflect.get(database, property);
    return typeof value === "function" ? value.bind(database) : value;
  },
});

export async function disconnectDatabase(): Promise<void> {
  await globalDatabase.centerPrisma?.$disconnect();
}
