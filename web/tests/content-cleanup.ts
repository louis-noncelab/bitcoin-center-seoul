import { expect, type APIRequestContext } from "@playwright/test";
import { z } from "zod";

export async function deleteContentFixture(request: APIRequestContext, path: string, origin: string): Promise<void> {
  const separator = path.lastIndexOf("/");
  const records = z.object({ data: z.array(z.object({ id: z.number(), revision: z.number() })) })
    .parse(await (await request.get(path.slice(0, separator))).json()).data;
  const record = records.find(item => item.id === Number(path.slice(separator + 1)));
  if (record) expect((await request.delete(path, { headers: { origin, "If-Match": `"${record.revision}"` } })).status()).toBe(200);
}
