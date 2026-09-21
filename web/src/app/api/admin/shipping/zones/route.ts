import { requireAccount } from "@/server/auth";
import { prisma } from "@/server/db";
import { assertSameOrigin, handleApi, json, readBody } from "@/server/http";
import { mutateShipping } from "@/server/shipping/admin";
import { idSchema, zoneSchema } from "@/server/shipping/validation";
import { z } from "zod";

export const GET = (request: Request) => handleApi(async () => {
  await requireAccount(request);
  return json(await prisma.shippingZone.findMany({ include: { countries: true, rates: { orderBy: { maxWeightG: "asc" } } }, orderBy: { nameKo: "asc" } }));
});

export const POST = (request: Request) => handleApi(async () => {
  assertSameOrigin(request);
  const account = await requireAccount(request);
  return json(await mutateShipping(account.id, { action: "zone.create", data: await readBody(request, zoneSchema) }), 201);
});

export const PATCH = (request: Request) => handleApi(async () => {
  assertSameOrigin(request);
  const account = await requireAccount(request);
  const { id, ...data } = await readBody(request, zoneSchema.extend({ id: idSchema, active: z.boolean() }));
  return json(await mutateShipping(account.id, { action: "zone.update", id, data }));
});

export const DELETE = (request: Request) => handleApi(async () => {
  assertSameOrigin(request);
  const account = await requireAccount(request);
  const { id } = await readBody(request, z.strictObject({ id: idSchema }));
  return json(await mutateShipping(account.id, { action: "zone.delete", id }));
});
