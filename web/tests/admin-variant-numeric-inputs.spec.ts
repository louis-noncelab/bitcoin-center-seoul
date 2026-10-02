import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { adminProductRecord } from "../src/lib/commerce-contract";
import { reviewOrigin, reviewRuntime } from "./helpers/review-runtime";

async function login(page: Page, path: string, baseURL: string | undefined) {
  const origin = reviewOrigin(baseURL);
  const { ADMIN_PASSWORD } = await reviewRuntime();
  const result = await page.request.post(`${origin}/api/admin/login`, { headers: { origin }, data: { password: ADMIN_PASSWORD } });
  expect(result.status(), `admin login failed with HTTP ${result.status()}`).toBe(200);
  await page.goto(`${origin}/ko${path}`);
  return origin;
}

const createdProduct = z.object({ data: z.object({ id: z.string() }) });
const adminProducts = z.object({ data: z.array(adminProductRecord) });
const productPayload = z.object({
  variants: z.array(z.object({
    sku: z.string(),
    stockOnHand: z.number().int(),
    billableWeightG: z.number().int(),
  })),
});

async function storedVariant(page: Page, origin: string, productId: string) {
  const response = await page.request.get(`${origin}/api/admin/products`);
  expect(response.status(), `admin products read failed with HTTP ${response.status()}`).toBe(200);
  const product = adminProducts.parse(await response.json()).data.find((item) => item.id === productId);
  if (!product) throw new Error("seeded product disappeared from admin products");
  const [variant] = product.variants;
  if (!variant) throw new Error("seeded product has no variants");
  return variant;
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
  return productPayload.parse(submitted.postDataJSON()).variants[0];
}

test("keeps variant numeric drafts from overwriting stored numbers until valid integers are entered", async ({ page, baseURL }) => {
  // Given an authenticated Korean product admin editing a seeded product with positive stock and weight.
  const origin = await login(page, "/admin/products", baseURL);
  const suffix = randomUUID().slice(0, 8);
  const title = `숫자 입력 검토 ${suffix}`;
  const seeded = await page.request.post(`${origin}/api/admin/products`, { headers: { origin }, data: {
    slug: `numeric-${suffix}`,
    titleKo: title,
    titleEn: `Numeric review ${suffix}`,
    descriptionKo: "숫자 입력 회귀 검토용 상품",
    descriptionEn: "Numeric input regression product",
    imageUrl: "",
    images: [],
    categoryId: "",
    published: false,
    memberOnly: false,
    priceKind: "KRW_FIXED",
    priceAmount: "1000",
    listPriceAmount: "",
    allowedFulfillments: ["PICKUP"],
    variants: [{
      sku: `NUMERIC-${suffix}`,
      optionLabelKo: "기본",
      optionLabelEn: "Default",
      stockOnHand: 9,
      billableWeightG: 250,
      active: true,
    }],
  } });
  expect(seeded.status(), `product seed failed with HTTP ${seeded.status()}`).toBe(201);
  const productId = createdProduct.parse(await seeded.json()).data.id;
  try {
  await openSeededProduct(page, origin, title);
  const stock = page.getByLabel("재고", { exact: true }).first();
  const weight = page.getByLabel("포장 무게 (g)", { exact: true }).first();
  await expect(stock).toHaveValue("9");
  await expect(weight).toHaveValue("250");

  // Invalid fractional drafts must not change the last valid numbers either.
  await stock.fill("1.5");
  await weight.fill("2.5");
  expect(await stock.evaluate((field) => (field as HTMLInputElement).validity.stepMismatch)).toBe(true);
  expect(await weight.evaluate((field) => (field as HTMLInputElement).validity.stepMismatch)).toBe(true);
  // When both numeric fields are cleared and the product is saved.
  await stock.fill("");
  await weight.fill("");
  const clearedPayload = await submitProductEdit(page, productId);
  // Then the submitted payload and stored product keep the last meaningful numbers.
  expect(clearedPayload).toMatchObject({ stockOnHand: 9, billableWeightG: 250 });
  expect(await storedVariant(page, origin, productId)).toMatchObject({ stockOnHand: 9, billableWeightG: 250 });

  // When explicit zero values are entered where the current minima allow zero.
  await openSeededProduct(page, origin, title);
  await page.getByLabel("재고", { exact: true }).first().fill("0");
  await page.getByLabel("포장 무게 (g)", { exact: true }).first().fill("0");
  const zeroPayload = await submitProductEdit(page, productId);
  // Then zero is submitted and persisted as an intentional value.
  expect(zeroPayload).toMatchObject({ stockOnHand: 0, billableWeightG: 0 });
  expect(await storedVariant(page, origin, productId)).toMatchObject({ stockOnHand: 0, billableWeightG: 0 });

  // When normal replacement integers are entered after zero.
  await openSeededProduct(page, origin, title);
  await page.getByLabel("재고", { exact: true }).first().fill("14");
  await page.getByLabel("포장 무게 (g)", { exact: true }).first().fill("375");
  const replacementPayload = await submitProductEdit(page, productId);
  // Then those replacements are submitted and persisted.
  expect(replacementPayload).toMatchObject({ stockOnHand: 14, billableWeightG: 375 });
  expect(await storedVariant(page, origin, productId)).toMatchObject({ stockOnHand: 14, billableWeightG: 375 });
  } finally {
    expect((await page.request.delete(`${origin}/api/admin/products/${productId}`, { headers: { origin } })).status()).toBe(200);
  }
});
