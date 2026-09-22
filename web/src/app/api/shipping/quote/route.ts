import { prisma } from "@/server/db";
import { assertSameOrigin, handleApi, json, readBody } from "@/server/http";
import { quoteShipping } from "@/server/shipping";
import { shippingInputSchema } from "@/server/shipping/validation";

export const POST = (request: Request) => handleApi(async () => {
  assertSameOrigin(request);
  const input = await readBody(request, shippingInputSchema);
  return json(await prisma.$transaction((tx) => quoteShipping(tx, input)));
});
