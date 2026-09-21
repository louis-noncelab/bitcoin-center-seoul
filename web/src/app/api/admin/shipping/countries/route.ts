import { requireAccount } from "@/server/auth";
import { prisma } from "@/server/db";
import { assertSameOrigin, handleApi, json, readBody } from "@/server/http";
import { mutateShipping } from "@/server/shipping/admin";
import { countryCodeSchema, countrySchema } from "@/server/shipping/validation";
import { z } from "zod";

export const GET = (request: Request) => handleApi(async () => {
  await requireAccount(request);
  return json(await prisma.shippingCountry.findMany({ include: { zone: true }, orderBy: { code: "asc" } }));
});

export const POST = (request: Request) => handleApi(async () => {
  assertSameOrigin(request);
  const account = await requireAccount(request);
  return json(await mutateShipping(account.id, { action: "country.create", data: await readBody(request, countrySchema) }), 201);
});

export const PATCH = (request: Request) => handleApi(async () => {
  assertSameOrigin(request);
  const account = await requireAccount(request);
  const data = await readBody(request, countrySchema.extend({ requiresPostalCode: z.boolean() }));
  return json(await mutateShipping(account.id, { action: "country.update", data }));
});

export const DELETE = (request: Request) => handleApi(async () => {
  assertSameOrigin(request);
  const account = await requireAccount(request);
  const { code } = await readBody(request, z.strictObject({ code: countryCodeSchema }));
  return json(await mutateShipping(account.id, { action: "country.delete", id: code }));
});
