import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { z } from "zod";
import { productSchema } from "../src/components/commerce/contracts";

const origin = process.env.COMMERCE_REVIEW_ORIGIN ?? "http://127.0.0.1:3100";
const catalogProductSchema = productSchema.extend({
  category: z.object({ slug: z.string().min(1), nameKo: z.string(), nameEn: z.string() }).nullable(),
});
type CatalogProduct = z.infer<typeof catalogProductSchema>;

async function liveCatalog(request: APIRequestContext): Promise<CatalogProduct[]> {
  const response = await request.get(`${origin}/api/products`);
  if (response.status() !== 200) throw new Error(`The catalog is empty (GET /api/products returned ${response.status()}).`);
  const products = z.object({ data: z.array(catalogProductSchema) }).parse(await response.json()).data;
  if (products.length < 2) throw new Error(`The catalog is empty (${products.length} listed products).`);
  return products;
}

function matchesQuery(product: CatalogProduct, query: string, locale: "ko" | "en") {
  const term = query.trim().toLocaleLowerCase(locale);
  const labels = [product.titleKo, product.titleEn, ...product.variants.flatMap((variant) => [variant.optionLabelKo, variant.optionLabelEn])];
  return term.length > 0 && labels.some((label) => label.toLocaleLowerCase(locale).includes(term));
}

function narrowingQuery(products: readonly CatalogProduct[], locale: "ko" | "en") {
  const labels = products.flatMap((product) => [product.titleKo, product.titleEn, ...product.variants.flatMap((variant) => [variant.optionLabelKo, variant.optionLabelEn])]);
  const chosen = [...new Set(labels.map((label) => label.trim()).filter((label) => label.length >= 2 && label.length <= 96))]
    .map((query) => ({ query, count: products.filter((product) => matchesQuery(product, query, locale)).length }))
    .filter((item) => item.count > 0 && item.count < products.length)
    .sort((left, right) => left.count - right.count || right.query.length - left.query.length)[0];
  if (!chosen) throw new Error("The catalog is empty: no title or option narrows the product list.");
  return chosen.query;
}

function categoryToFilter(products: readonly CatalogProduct[], locale: "ko" | "en") {
  const choices = new Map<string, NonNullable<CatalogProduct["category"]>>();
  for (const product of products) if (product.category) choices.set(product.category.slug, product.category);
  const available = [...choices.values()].filter((category) => (locale === "ko" ? category.nameKo : category.nameEn).trim().length > 0);
  const chosen = available.find((category) => products.some((product) => product.category?.slug !== category.slug)) ?? available[0];
  if (!chosen) throw new Error("The catalog is empty: no category slug is available to filter.");
  return chosen;
}

function categoryControl(page: Page, locale: "ko" | "en") {
  const name = locale === "ko" ? "종류" : "Category";
  return page.getByRole("combobox", { name, exact: true });
}

async function chooseCategory(page: Page, locale: "ko" | "en", category: NonNullable<CatalogProduct["category"]>) {
  await categoryControl(page, locale).selectOption(category.slug);
  await expect(categoryControl(page, locale)).toHaveValue(category.slug);
}

function expectedHrefs(products: readonly CatalogProduct[], locale: "ko" | "en") {
  return products.map((product) => `/${locale}/shop/${product.slug}`).sort();
}

async function cardHrefs(page: Page) {
  return page.locator(".review-grid article a").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href") ?? "").filter((href) => href.length > 0).sort());
}

test("in-stock filter follows available variant stock from the catalog", async ({ page, request }) => {
  const products = await liveCatalog(request);
  const available = products.filter((product) => product.variants.some((variant) => variant.availableStock > 0));
  await page.goto(`${origin}/en/shop`);
  await page.getByRole("checkbox", { name: "In-stock products only" }).check();
  await expect(page.locator(".review-grid article")).toHaveCount(available.length);
  expect(await cardHrefs(page)).toEqual(expectedHrefs(available, "en"));
});

for (const locale of ["ko", "en"] as const) {
  test(`catalog filters combine and reset in ${locale}`, async ({ page, request }) => {
    const products = await liveCatalog(request);
    await page.goto(`${origin}/${locale}/shop`);
    const search = page.getByRole("searchbox", { name: locale === "ko" ? "상품 검색" : "Search products" });
    const cards = page.locator(".review-grid article");
    await expect(cards).toHaveCount(products.length);

    const query = narrowingQuery(products, locale);
    await search.fill(`  ${query}  `);
    const matched = products.filter((product) => matchesQuery(product, query, locale));
    expect(matched.length).toBeGreaterThan(0);
    expect(matched.length).toBeLessThan(products.length);
    await expect(cards).toHaveCount(matched.length);
    expect(await cardHrefs(page)).toEqual(expectedHrefs(matched, locale));

    const category = categoryToFilter(products, locale);
    await chooseCategory(page, locale, category);
    const combined = matched.filter((product) => product.category?.slug === category.slug);
    await expect(cards).toHaveCount(combined.length);
    expect(await cardHrefs(page)).toEqual(expectedHrefs(combined, locale));

    await page.getByRole("button", { name: locale === "ko" ? "필터 초기화" : "Reset filters", exact: true }).click();
    await expect(cards).toHaveCount(products.length);
    await expect(search).toHaveValue("");
    await expect(categoryControl(page, locale)).toHaveValue("");

    const stock = page.getByRole("checkbox", { name: locale === "ko" ? "재고 있는 상품만" : "In-stock products only" });
    await stock.check();
    await expect(stock).toBeChecked();
    const available = products.filter((product) => product.variants.some((variant) => variant.availableStock > 0));
    await expect(cards).toHaveCount(available.length);
    expect(await cardHrefs(page)).toEqual(expectedHrefs(available, locale));
  });
}

for (const width of [375, 768, 1440]) {
  for (const theme of ["light", "dark"] as const) {
    test(`catalog controls fit ${width}px ${theme} with reduced motion`, async ({ page }) => {
      await page.setViewportSize({ width, height: 950 });
      await page.emulateMedia({ reducedMotion: "reduce", colorScheme: theme });
      await page.context().addCookies([{ name: "bcs-theme", value: theme, url: origin }]);
      await page.goto(`${origin}/en/shop`);
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      const search = page.getByRole("searchbox", { name: "Search products" });
      await search.fill("bitcoin");
      await expect(search).toBeFocused();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await expect(page.locator(".collection-results")).toHaveCSS("animation-name", "none");
      await expect(categoryControl(page, "en")).toBeVisible();
    });
  }
}
