import { handleApi, json } from "@/server/http";
import { getProduct } from "@/server/catalog";
export const GET = (_request: Request, context: { params: Promise<{ slug: string }> }) => handleApi(async () => json(await getProduct((await context.params).slug)));
