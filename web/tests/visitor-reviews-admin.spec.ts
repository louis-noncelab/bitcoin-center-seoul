import { expect, test, type APIRequestContext } from "@playwright/test";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { z } from "zod";
import { reviewAdminSchema, reviewRecordSchema, type ReviewRecord } from "@/lib/reviews-contract";

const endpoint = "/api/admin/reviews";
const origin = "http://127.0.0.1:3102";
const headers = { origin };
const version = (revision: number) => ({ ...headers, "If-Match": `"${revision}"` });
const recordInput = ({ id, revision, created_at, updated_at, ...input }: ReviewRecord) => { void id; void revision; void created_at; void updated_at; return input; };
async function login(request: APIRequestContext) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error("Run through npm run review -- test.");
  expect((await request.post("/api/admin/login", { headers, data: { password } })).status()).toBe(200);
}
async function state(request: APIRequestContext) { return z.object({ data: reviewAdminSchema }).parse(await (await request.get(endpoint)).json()).data; }
async function cleanup(request: APIRequestContext, id: number) {
  const record = (await state(request)).records.find(item => item.id === id);
  if (record) expect((await request.delete(`${endpoint}/${id}`, { headers: version(record.revision) })).status()).toBe(200);
}

test("review writes enforce auth, origin, schemas and record/selection revisions", async ({ request }) => {
  const input = { title: `후기 API ${randomUUID()}`, kind: "blog", author: "테스트 방문자", url: "https://example.com/visit", summary: "방문 소개" };
  expect((await request.get(endpoint)).status()).toBe(401);
  expect((await request.post(endpoint, { headers, data: input })).status()).toBe(401);
  expect((await request.put(`${endpoint}/1`, { headers, data: input })).status()).toBe(401);
  expect((await request.delete(`${endpoint}/1`, { headers })).status()).toBe(401);
  expect((await request.put(`${endpoint}/selection`, { headers, data: {} })).status()).toBe(401);
  await login(request);
  for (const [method, path] of [["post", endpoint], ["put", `${endpoint}/1`], ["delete", `${endpoint}/1`], ["put", `${endpoint}/selection`]] as const) {
    expect((await request[method](path, { headers: { origin: "https://attacker.invalid" }, data: input })).status()).toBe(403);
  }
  for (const patch of [{ url: "javascript:alert(1)" }, { url: "https://user:password@example.com" }, { image: "/images/uploads/missing.webp" }, { image: "/images/uploads/../secret.webp" }, { date: "2026-02-30" }, { summary: "" }, { is_active: 2 }, { extra: true }]) {
    expect((await request.post(endpoint, { headers, data: { ...input, ...patch } })).status()).toBe(400);
  }
  const result = await request.post(endpoint, { headers, data: input });
  expect(result.status()).toBe(201);
  const record = z.object({ data: reviewRecordSchema }).parse(await result.json()).data;
  const original = (await state(request)).selection;
  try {
    expect(await (await request.get("/ko/reviews")).text()).not.toContain(input.title);
    expect((await request.put(`${endpoint}/${record.id}`, { headers, data: input })).status()).toBe(428);
    const saved = await request.put(`${endpoint}/${record.id}`, { headers: version(record.revision), data: { ...input, title: `${input.title} A` } });
    expect(saved.status()).toBe(200);
    expect((await request.put(`${endpoint}/${record.id}`, { headers: version(record.revision), data: { ...input, title: `${input.title} B` } })).status()).toBe(409);
    expect((await request.delete(`${endpoint}/${record.id}`, { headers: version(record.revision) })).status()).toBe(409);
    expect((await state(request)).records.find(item => item.id === record.id)?.title).toBe(`${input.title} A`);
    for (const data of [{ featured_id: record.id, home_ids: [] }, { featured_id: null, home_ids: [record.id] }, { featured_id: null, home_ids: [1,1] }, { featured_id: null, home_ids: [1,2,3,4] }]) {
      expect((await request.put(`${endpoint}/selection`, { headers: version(original.revision), data })).status()).toBe(400);
    }
    const selected = await request.put(`${endpoint}/selection`, { headers: version(original.revision), data: { featured_id: null, home_ids: [] } });
    expect(selected.status()).toBe(200);
    expect((await request.put(`${endpoint}/selection`, { headers: version(original.revision), data: { featured_id: original.featured_id, home_ids: original.home_ids } })).status()).toBe(409);
  } finally {
    const latest = (await state(request)).selection;
    expect((await request.put(`${endpoint}/selection`, { headers: version(latest.revision), data: { featured_id: original.featured_id, home_ids: original.home_ids } })).status()).toBe(200);
    await cleanup(request, record.id);
  }
});

test("admin uploads, publishes, selects, edits and hides a review without rebuilding", async ({ page, request }) => {
  page.setDefaultTimeout(5000);
  await login(page.request);
  const original = (await state(page.request)).selection;
  let id: number | undefined;
  const title = `방문 후기 ${randomUUID()}`;
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  try {
    await page.goto("/ko/admin/reviews");
    await page.getByRole("button", { name: "방문 후기 등록", exact: true }).click();
    await page.getByLabel("작성자", { exact: true }).fill("방문자");
    await page.getByLabel("원문 링크", { exact: true }).fill("https://example.com/review");
    await page.getByLabel("제목", { exact: true }).fill(title);
    await page.getByLabel("소개", { exact: true }).fill("센터에서 보낸 오후 <script>alert(1)</script>");
    await page.getByLabel("대표 후기 제목 (선택)", { exact: true }).fill("센터에서 보낸 오후");
    const photo = await sharp({ create: { width: 640, height: 360, channels: 3, background: "#c6c7b8" } }).png().toBuffer();
    await page.getByLabel("썸네일 사진 선택", { exact: true }).setInputFiles({ name: "review.png", mimeType: "image/png", buffer: photo });
    await expect(page.getByAltText("후기 썸네일")).toBeVisible();
    await page.getByLabel("표시 순서", { exact: true }).fill("-999");
    await page.getByLabel("공개", { exact: true }).check();
    await page.getByRole("button", { name: "저장", exact: true }).click();
    await expect(page.getByText("저장했습니다.", { exact: true })).toBeVisible();
    const record = (await state(page.request)).records.find(item => item.title === title);
    if (!record) throw new Error("Review not saved");
    id = record.id;
    expect((await request.get(record.image)).status()).toBe(200);
    await page.getByRole("combobox", { name: "후기 페이지 대표", exact: true }).selectOption(String(id));
    await page.getByRole("combobox", { name: "홈 후기 1", exact: true }).selectOption(String(id));
    await page.getByRole("button", { name: "선택 저장", exact: true }).click();
    await expect(page.getByText("후기 선택을 저장했습니다.", { exact: true })).toBeVisible();
    await page.goto("/en/reviews");
    await expect(page.locator(".review-card").first().getByRole("heading")).toHaveText(title);
    await expect(page.locator("#review-feature-title")).toHaveText("센터에서 보낸 오후");
    await expect(page.locator(".review-feature-context script")).toHaveCount(0);
    expect(await page.locator(".review-feature-photo img").evaluate(img => img instanceof HTMLImageElement && img.complete && img.naturalWidth > 0)).toBe(true);
    await page.goto("/ko");
    await expect(page.locator("#reviews .review-card").first().getByRole("heading")).toHaveText(title);
    await page.goto("/ko/admin/reviews");
    const row = page.locator(".events-admin-list > li").filter({ has: page.getByRole("heading", { name: title, exact: true }) });
    await row.getByRole("button", { name: "수정", exact: true }).click();
    await page.getByLabel("공개", { exact: true }).uncheck();
    await page.getByRole("button", { name: "저장", exact: true }).click();
    await expect(page.getByText("저장했습니다.", { exact: true })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "후기 페이지 대표", exact: true }).locator("option:checked")).toContainText("비공개");
    expect((await request.get(record.image)).status()).toBe(404);
    expect((await page.request.get(record.image)).status()).toBe(200);
    await page.goto("/ko/reviews");
    await expect(page.locator("#review-feature-title")).toHaveCount(0);
    await expect(page.locator(`.review-card[data-review-id="${id}"]`)).toHaveCount(0);
    await page.goto("/ko");
    await expect(page.locator(`#reviews .review-card[data-review-id="${id}"]`)).toHaveCount(0);
    expect(errors).toEqual([]);
  } finally {
    const latest = (await state(page.request)).selection;
    expect((await page.request.put(`${endpoint}/selection`, { headers: version(latest.revision), data: { featured_id: original.featured_id, home_ids: original.home_ids } })).status()).toBe(200);
    if (id) await cleanup(page.request, id);
  }
});

test("stale browser editor retains its draft and reloads latest after confirmation", async ({ browser }) => {
  const context = await browser.newContext({ baseURL: origin });
  await login(context.request);
  const input = { kind: "note", title: `충돌 후기 ${randomUUID()}`, author: "방문자", url: "https://example.com/review", summary: "소개" };
  const created = await context.request.post(endpoint, { headers, data: input });
  const record = z.object({ data: reviewRecordSchema }).parse(await created.json()).data;
  try {
    const page = await context.newPage();
    await page.goto("/ko/admin/reviews");
    await page.locator(".events-admin-list > li").filter({ has: page.getByRole("heading", { name: input.title, exact: true }) }).getByRole("button", { name: "수정", exact: true }).click();
    await page.getByLabel("제목", { exact: true }).fill(`${input.title} 내 초안`);
    expect((await context.request.put(`${endpoint}/${record.id}`, { headers: version(record.revision), data: { ...recordInput(record), title: `${input.title} 먼저 저장` } })).status()).toBe(200);
    await page.getByRole("button", { name: "저장", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: "다른 사람이" })).toBeVisible();
    await expect(page.getByLabel("제목", { exact: true })).toHaveValue(`${input.title} 내 초안`);
    await page.getByRole("button", { name: "최신 내용 불러오기", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "버리기", exact: true }).click();
    await expect(page.getByRole("heading", { name: `${input.title} 먼저 저장`, exact: true })).toBeVisible();
  } finally { await cleanup(context.request, record.id); await context.close(); }
});

test("article editor publishes inline photos, SEO, redirects and hides the detail", async ({ page, request, browser }) => {
  await login(page.request);
  const slug = `visitor-story-${randomUUID().slice(0, 8)}`;
  let id: number | undefined;
  try {
    await page.goto("/ko/admin/reviews");
    await page.getByRole("button", { name: "방문 후기 등록", exact: true }).click();
    await page.getByLabel("작성자", { exact: true }).fill("방문자");
    await page.getByLabel("원문 링크", { exact: true }).fill("https://example.com/original");
    await page.getByLabel("제목", { exact: true }).fill("함께 배우고 쉬어간 오후");
    await page.getByLabel("소개", { exact: true }).fill("센터에서 보낸 오후의 방문 기록입니다.");
    await page.locator('[name="slug"]').fill(slug);
    await page.locator('[name="description"]').fill("## 함께한 시간\n\n사진과 함께 남기는 방문 소개입니다.\n\n<script>window.articleXss=true</script>");
    const photo = await sharp({ create: { width: 640, height: 360, channels: 3, background: "#c6c7b8" } }).png().toBuffer();
    await page.getByLabel("후기 본문 (선택) 사진 파일 선택", { exact: true }).setInputFiles([
      { name: "first.png", mimeType: "image/png", buffer: photo }, { name: "second.png", mimeType: "image/png", buffer: photo },
    ]);
    await expect(page.locator('[name="description"]')).toHaveValue(/second.*\.webp/);
    await page.getByLabel("공개", { exact: true }).check();
    await page.getByRole("button", { name: "저장", exact: true }).click();
    await expect(page.getByText("저장했습니다.", { exact: true })).toBeVisible();
    const record = (await state(page.request)).records.find(item => item.slug === slug);
    if (!record) throw new Error("Saved article missing");
    id = record.id;
    const bodyImage = record.description.match(/\((\/images\/[^)]+)\)/)?.[1];
    if (!bodyImage) throw new Error("Body image missing");
    await page.goto("/ko/reviews");
    await page.locator(".review-more summary").click();
    const card = page.locator(`.review-card-link[href="/ko/reviews/${slug}"]`);
    await expect(card).not.toHaveAttribute("target", "_blank");
    await card.click();
    await expect(page).toHaveURL(`/ko/reviews/${slug}`);
    await expect(page.locator(".review-story .markdown-content img")).toHaveCount(2);
    await expect(page.getByRole("link", { name: /원문에서 전체 후기 읽기/ })).toHaveAttribute("href", "https://example.com/original");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://bitcoincenterseoul.com/ko/reviews/${slug}`);
    await expect(page.locator('link[hreflang="en"]')).toHaveAttribute("href", `https://bitcoincenterseoul.com/en/reviews/${slug}`);
    const graph = JSON.parse(await page.locator('script[type="application/ld+json"]').last().textContent() ?? "null");
    expect(graph["@graph"][0].citation).toBe("https://example.com/original");
    expect(await page.evaluate(() => Reflect.get(window, "articleXss"))).toBeUndefined();
    expect((await request.get(bodyImage)).status()).toBe(200);
    expect(await (await request.get("/sitemap.xml")).text()).toContain(`/ko/reviews/${slug}`);
    const noScript = await browser.newContext({ javaScriptEnabled: false });
    const plain = await noScript.newPage();
    await plain.goto(`${origin}/en/reviews/${slug}`);
    await expect(plain.locator(".markdown-content")).toHaveAttribute("lang", "ko");
    await noScript.close();
    const moved = z.object({ data: reviewRecordSchema }).parse(await (await page.request.put(`${endpoint}/${id}`, { headers: version(record.revision), data: { ...recordInput(record), slug: `${slug}-new` } })).json()).data;
    const redirect = await request.get(`/ko/reviews/${slug}`, { maxRedirects: 0 });
    expect(redirect.status()).toBe(308);
    expect(redirect.headers()["location"]).toBe(`/ko/reviews/${moved.slug}`);
    expect((await page.request.put(`${endpoint}/${id}`, { headers: version(moved.revision), data: { ...recordInput(moved), is_active: 0 } })).status()).toBe(200);
    expect((await request.get(`/ko/reviews/${moved.slug}`)).status()).toBe(404);
    expect((await request.get(bodyImage)).status()).toBe(404);
    expect(await (await request.get("/sitemap.xml")).text()).not.toContain(`/ko/reviews/${moved.slug}`);
  } finally { if (id) await cleanup(page.request, id); }
});
