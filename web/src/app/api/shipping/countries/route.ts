import { handleApi, json } from "@/server/http";
import { shippingCountries } from "@/server/shipping";

// Checkout loads this alongside the product list; without it the whole page fails to render.
export const runtime = "nodejs";
export const GET = () => handleApi(async () => json(await shippingCountries()));
