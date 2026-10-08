import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { adminProductRecord } from "../src/lib/commerce-contract";
import { reviewOrigin, reviewRuntime } from "./helpers/review-runtime";

async function login(page: Page, baseURL: string | undefined) {
  const origin = reviewOrigin(baseURL);
  const { ADMIN_PASSWORD } = await reviewRuntime();
  const result = await page.request.post(`${origin}/api/admin/login`, { headers: { origin }, data: { password: ADMIN_PASSWORD } });
  expect(result.status(), `admin login failed with HTTP ${result.status()}`).toBe(200);
  return origin;
}

const createdProduct = z.object({ data: z.object({ id: z.string() }) });
const adminProducts = z.object({ data: z.array(adminProductRecord) });
const productPayload = z.object({
  variants: z.array(z.object({
    id: z.string().optional(),
    sku: z.string(),
    stockOnHand: z.number().int().optional(),
    expectedStockOnHand: z.number().int().optional(),
    billableWeightG: z.number().int(),
  })),
});

async function storedVariants(page: Page, origin: string, productId: string) {
  const response = await page.request.get(`${origin}/api/admin/products`);
  expect(response.status()).toBe(200);
  const product = adminProducts.parse(await response.json()).data.find((item) => item.id === productId);
  if (!product) throw new Error("Seeded product disappeared from admin products");
  return product.variants;
}

async function openSeededProduct(page: Page, origin: string, title: string) {
  await page.goto(`${origin}/ko/admin/products`);
  await expect(page.getByRole("heading", { name: "상품 목록", exact: true })).toBeVisible();
  const row = page.locator(".events-admin-list > li").filter({ has: page.getByRole("heading", { name: title, exact: true }) });
  await row.getByRole("button", { name: "수정", exact: true }).click();
  await expect(page.getByRole("heading", { name: "상품 수정", exact: true })).toBeVisible();
}

async function submitProductEdit(page: Page, productId: string) {
  const request = page.waitForRequest((candidate) => candidate.url().endsWith(`/api/admin/products/${productId}`) && candidate.method() === "PATCH");
  const response = page.waitForResponse((candidate) => candidate.url().endsWith(`/api/admin/products/${productId}`) && candidate.request().method() === "PATCH");
  await page.locator("form").getByRole("button", { name: "저장", exact: true }).click();
  const submitted = await request;
  expect((await response).status()).toBe(200);
  await expect(page.getByRole("heading", { name: "상품 목록", exact: true })).toBeVisible();
  return productPayload.parse(submitted.postDataJSON()).variants;
}

test("numeric drafts retain meaningful values and submit the exact stock CAS contract", async ({ page, baseURL }) => {
  // Given an authenticated product admin and a variant with positive stock and weight.
  const origin = await login(page, baseURL);
  const suffix = randomUUID().slice(0, 8);
  const title = `숫자 입력 검토 ${suffix}`;
  const seeded = await page.request.post(`${origin}/api/admin/products`, { headers: { origin }, data: {
    slug: `numeric-${suffix}`, titleKo: title, titleEn: `Numeric review ${suffix}`,
    descriptionKo: "숫자 입력 회귀 검토용 상품", descriptionEn: "Numeric input regression product",
    imageUrl: "", images: [], categoryId: "", published: false, memberOnly: false,
    priceKind: "KRW_FIXED", priceAmount: "1000", listPriceAmount: "", allowedFulfillments: ["PICKUP"],
    variants: [{ sku: `NUMERIC-${suffix}`, optionLabelKo: "기본", optionLabelEn: "Default", stockOnHand: 9, billableWeightG: 250, active: true }],
  } });
  expect(seeded.status()).toBe(201);
  const productId = createdProduct.parse(await seeded.json()).data.id;
  try {
    await openSeededProduct(page, origin, title);
    const stock = page.getByLabel("재고", { exact: true }).first();
    const weight = page.getByLabel("포장 무게 (g)", { exact: true }).first();
    await expect(stock).toHaveValue("9");
    await expect(weight).toHaveValue("250");

    // When fractional and out-of-range drafts are entered, then cleared and saved.
    for (const value of ["1.5", "-1", "1000001"]) {
      await stock.fill(value);
      await weight.fill(value);
      expect(await stock.evaluate((field) => field instanceof HTMLInputElement && !field.validity.valid)).toBe(true);
      expect(await weight.evaluate((field) => field instanceof HTMLInputElement && !field.validity.valid)).toBe(true);
    }
    await stock.fill("");
    await weight.fill("");
    await expect(stock).toHaveValue("");
    await expect(weight).toHaveValue("");
    const [cleared] = await submitProductEdit(page, productId);
    // Then unchanged existing stock and its CAS baseline are omitted, not resubmitted.
    expect(cleared).not.toHaveProperty("stockOnHand");
    expect(cleared).not.toHaveProperty("expectedStockOnHand");
    expect(cleared).toMatchObject({ billableWeightG: 250 });
    expect((await storedVariants(page, origin, productId))[0]).toMatchObject({ stockOnHand: 9, billableWeightG: 250 });

    // When explicit zeros are saved, then stock carries the original baseline.
    await openSeededProduct(page, origin, title);
    await stock.fill("0");
    await weight.fill("0");
    const [zero] = await submitProductEdit(page, productId);
    expect(zero).toMatchObject({ stockOnHand: 0, expectedStockOnHand: 9, billableWeightG: 0 });
    expect((await storedVariants(page, origin, productId))[0]).toMatchObject({ stockOnHand: 0, billableWeightG: 0 });

    // When replacement integers are followed by invalid/blank drafts, the last valid values win.
    await openSeededProduct(page, origin, title);
    await stock.fill("14");
    await weight.fill("375");
    await stock.fill("1.5");
    await weight.fill("");
    await stock.fill("");
    const [replacement] = await submitProductEdit(page, productId);
    expect(replacement).toMatchObject({ stockOnHand: 14, expectedStockOnHand: 0, billableWeightG: 375 });
    expect((await storedVariants(page, origin, productId))[0]).toMatchObject({ stockOnHand: 14, billableWeightG: 375 });

    // When a new option is added, it gets initial stock without an existing-stock baseline.
    await openSeededProduct(page, origin, title);
    await page.getByRole("button", { name: "옵션 추가", exact: true }).click();
    const sku = `ADDED-${suffix}`;
    await page.getByLabel("SKU", { exact: true }).nth(1).fill(sku);
    await page.getByLabel("재고", { exact: true }).nth(1).fill("3");
    const addedPayload = await submitProductEdit(page, productId);
    const existing = addedPayload.find((variant) => variant.id);
    const added = addedPayload.find((variant) => variant.sku === sku);
    expect(existing).not.toHaveProperty("stockOnHand");
    expect(existing).not.toHaveProperty("expectedStockOnHand");
    expect(added).toMatchObject({ stockOnHand: 3, billableWeightG: 0 });
    expect(added).not.toHaveProperty("id");
    expect(added).not.toHaveProperty("expectedStockOnHand");
    expect((await storedVariants(page, origin, productId)).find((variant) => variant.sku === sku)).toMatchObject({ stockOnHand: 3, reservedStock: 0 });
  } finally {
    expect((await page.request.delete(`${origin}/api/admin/products/${productId}`, { headers: { origin } })).status()).toBe(200);
  }
});
