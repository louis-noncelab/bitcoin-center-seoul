import { requireAccount } from "@/server/auth";
import { prisma } from "@/server/db";
import { assertSameOrigin, handleApi, json, readBody } from "@/server/http";
import { mutateShipping } from "@/server/shipping/admin";
import { idSchema, rateSchema } from "@/server/shipping/validation";
import { z } from "zod";

export const GET = (request: Request) => handleApi(async () => {
  await requireAccount(request);
  return json(await prisma.shippingRate.findMany({ include: { zone: true }, orderBy: [{ zoneId: "asc" }, { maxWeightG: "asc" }] }));
});

export const POST = (request: Request) => handleApi(async () => {
  assertSameOrigin(request);
  const account = await requireAccount(request);
  return json(await mutateShipping(account.id, { action: "rate.create", data: await readBody(request, rateSchema) }), 201);
});

export const PATCH = (request: Request) => handleApi(async () => {
  assertSameOrigin(request);
  const account = await requireAccount(request);
  const { id, ...data } = await readBody(request, rateSchema.extend({ id: idSchema }));
  return json(await mutateShipping(account.id, { action: "rate.update", id, data }));
});

export const DELETE = (request: Request) => handleApi(async () => {
  assertSameOrigin(request);
  const account = await requireAccount(request);
  const { id } = await readBody(request, z.strictObject({ id: idSchema }));
  return json(await mutateShipping(account.id, { action: "rate.delete", id }));
});
