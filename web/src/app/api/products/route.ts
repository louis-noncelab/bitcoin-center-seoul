import { handleApi, json } from "@/server/http";
import { listProducts } from "@/server/catalog";
export const GET = () => handleApi(async () => json(await listProducts()));
