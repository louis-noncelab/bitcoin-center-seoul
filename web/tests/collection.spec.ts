import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { z } from "zod";
import { collectionRecordSchema } from "@/lib/collection-contract";

const password = process.env.ADMIN_PASSWORD;
const listSchema = z.object({ data: z.array(collectionRecordSchema) });

test("collection APIs enforce authentication, origin, bounded input and private drafts", async ({ request, baseURL }) => {
  if (!password) throw new Error("Run through npm run review -- test.");
  const headers = { origin: baseURL ?? "" };
  const input = { kind: "book", title: `검증용 도서 ${randomUUID()}`, images: [] };
  expect((await request.get("/api/admin/collection")).status()).toBe(401);
  expect((await request.post("/api/admin/collection", { headers, data: input })).status()).toBe(401);
  expect((await request.put("/api/admin/collection/999999", { headers, data: input })).status()).toBe(401);
  expect((await request.delete("/api/admin/collection/999999", { headers })).status()).toBe(401);
  expect((await request.post("/api/admin/login", { headers, data: { password } })).status()).toBe(200);
  expect((await request.post("/api/admin/collection", { headers: { origin: "https://attacker.invalid" }, data: input })).status()).toBe(403);
  expect((await request.put("/api/admin/collection/999999", { headers: { origin: "https://attacker.invalid" }, data: input })).status()).toBe(403);
  expect((await request.delete("/api/admin/collection/999999", { headers: { origin: "https://attacker.invalid" } })).status()).toBe(403);
  for (const invalid of [{ kind: "other" }, { title: "" }, { is_active: 1 }, { sort_order: 100001 }, { sort_order: 0.5 }, { images: ["https://example.com/image.png"] }, { images: ["/images/uploads/../escape.png"] }, { images: ["/images/uploads/missing.webp"] }, { images: Array(13).fill("/images/uploads/missing.webp") }, { title: "a".repeat(201) }, { description: "a".repeat(20001) }, { extra: true }]) {
    expect((await request.post("/api/admin/collection", { headers, data: { ...input, ...invalid } })).status()).toBe(400);
  }
  expect((await request.post("/api/admin/collection", { headers: { ...headers, "content-type": "text/plain" }, data: "{}" })).status()).toBe(415);
  expect((await request.post("/api/admin/collection", { headers, data: { ...input, description: "a".repeat(270000) } })).status()).toBe(413);

  const created = await request.post("/api/admin/collection", { headers, data: input });
  expect(created.status()).toBe(201);
  const draft = z.object({ data: collectionRecordSchema }).parse(await created.json()).data;
  try {
    expect(draft.is_active).toBe(0);
    expect((await request.get(`/api/collection/${draft.id}`)).status()).toBe(404);
    expect((await request.get(`/ko/collection/${draft.id}`)).status()).toBe(404);
    expect(listSchema.parse(await (await request.get("/api/collection")).json()).data.some((record) => record.id === draft.id)).toBe(false);
    expect(await (await request.get("/sitemap.xml")).text()).not.toContain(`/collection/${draft.id}<`);
    expect((await request.get("/ko/admin/collection")).headers()["x-robots-tag"]).toContain("noindex");
  } finally {
    expect((await request.delete(`/api/admin/collection/${draft.id}`, { headers })).status()).toBe(200);
  }
});

test("admin uploads, publishes, browses, edits and deletes a collection item", async ({ page, baseURL }) => {
  if (!password) throw new Error("Run through npm run review -- test.");
  const title = `검증용 작품 ${randomUUID()}`;
  let id: number | undefined;
  const headers = { origin: baseURL ?? "" };
  const portrait = await sharp({ create: { width: 400, height: 600, channels: 3, background: "#d8dcd3" } }).png().toBuffer();
  const landscape = await sharp({ create: { width: 800, height: 400, channels: 3, background: "#76adeb" } }).png().toBuffer();
  await page.goto("/ko/admin/collection");
  await page.getByLabel("관리자 비밀번호", { exact: true }).fill(password);
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(page.getByRole("heading", { name: "도서·작품 목록" })).toBeVisible();
  try {
    await page.getByRole("button", { name: "도서·작품 등록", exact: true }).click();
    await page.getByRole("radio", { name: "작품", exact: true }).check();
    await page.getByLabel("제목", { exact: true }).fill(title);
    await page.getByLabel("저자·작가 (선택)", { exact: true }).fill("검증용 작가");
    await page.getByLabel("소개 (선택)", { exact: true }).fill("## 작품 소개\n\n**강조 문장**\n\n<script>window.testInjected=true</script>");
    await page.getByLabel("공개", { exact: true }).check();
    await page.getByRole("button", { name: "저장", exact: true }).click();
    await expect(page.locator('.events-error[role="alert"]')).toContainText("대표 이미지");
    await page.locator('.events-gallery-field input[type="file"]').setInputFiles([{ name: "portrait.png", mimeType: "image/png", buffer: portrait }, { name: "landscape.png", mimeType: "image/png", buffer: landscape }]);
    await expect(page.locator(".events-gallery-editor img")).toHaveCount(2);
    await page.getByRole("button", { name: "사진 2 앞으로", exact: true }).click();
    await page.getByLabel("표시 순서", { exact: true }).fill("-10");
    await page.getByRole("button", { name: "저장", exact: true }).click();
    await expect(page.getByText("저장했습니다.", { exact: true })).toBeVisible();
    const item = listSchema.parse(await (await page.request.get("/api/admin/collection")).json()).data.find((record) => record.title === title);
    if (!item) throw new Error("Saved collection item missing.");
    id = item.id;
    expect(item).toMatchObject({ kind: "artwork", sort_order: -10, is_active: 1 });
    expect(item.images).toHaveLength(2);
    expect(await (await page.request.get("/sitemap.xml")).text()).toContain(`/collection/${id}</loc>`);
    const { id: savedId, created_at, updated_at, ...input } = item;
    expect(savedId).toBe(id); expect(created_at).toBeTruthy(); expect(updated_at).toBeTruthy();
    expect((await page.request.put(`/api/admin/collection/${id}`, { headers, data: { ...input, images: [item.images[0], item.images[0]] } })).status()).toBe(400);
    await page.goto("/en/collection");
    const gallery = page.getByRole("tabpanel", { name: "All", exact: true });
    await expect(gallery.getByRole("heading", { name: title, exact: true })).toBeVisible();
    await page.getByRole("tab", { name: "Books", exact: true }).click();
    await expect(page.getByRole("tabpanel", { name: "Books", exact: true }).getByRole("heading", { name: title, exact: true })).toHaveCount(0);
    await page.getByRole("tab", { name: "Books", exact: true }).press("ArrowRight");
    await expect(page.getByRole("tab", { name: "Art", exact: true })).toHaveAttribute("aria-selected", "true");
    await page.getByRole("tabpanel", { name: "Art", exact: true }).getByRole("link").filter({ hasText: title }).click();
    await expect(page).toHaveURL(`/en/collection/${id}`);
    await expect(page.locator("main h1")).toHaveText(title);
    await expect(page.locator(".photo-gallery img")).toHaveCount(2);
    await expect(page.locator(".event-description")).toHaveAttribute("lang", "ko");
    await expect(page.locator(".event-description strong")).toHaveText("강조 문장");
    await expect(page.locator(".event-description script")).toHaveCount(0);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`/en/collection/${id}$`));
    await page.goto("/ko/admin/collection");
    const row = page.locator(".events-admin-list > li").filter({ hasText: title });
    await row.getByRole("button", { name: "수정", exact: true }).click();
    await page.getByLabel("제목", { exact: true }).fill(`${title} 수정`);
    await page.getByRole("button", { name: "취소", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "취소", exact: true }).click();
    await expect(page.getByLabel("제목", { exact: true })).toHaveValue(`${title} 수정`);
    await page.getByLabel("공개", { exact: true }).uncheck();
    await page.request.post("/api/admin/logout", { headers, data: {} });
    await page.getByRole("button", { name: "저장", exact: true }).click();
    await expect(page.locator(".events-reauth")).toBeVisible();
    await expect(page.getByLabel("제목", { exact: true })).toHaveValue(`${title} 수정`);
    await page.getByLabel("관리자 비밀번호", { exact: true }).fill(password);
    await page.getByRole("button", { name: "로그인", exact: true }).click();
    await expect(page.locator(".events-reauth")).toHaveCount(0);
    await page.getByRole("button", { name: "저장", exact: true }).click();
    await expect(page.getByText("저장했습니다.", { exact: true })).toBeVisible();
    expect((await page.request.get(`/en/collection/${id}`)).status()).toBe(404);
    expect(await (await page.request.get("/sitemap.xml")).text()).not.toContain(`/collection/${id}</loc>`);
    await row.getByRole("button", { name: "삭제", exact: true }).click();
    await page.getByRole("dialog", { name: "도서·작품 삭제", exact: true }).getByRole("button", { name: "삭제", exact: true }).click();
    await expect(page.getByText("삭제했습니다.", { exact: true })).toBeVisible();
    expect((await page.request.get(`/api/collection/${id}`)).status()).toBe(404);
    id = undefined;
  } finally {
    if (id) await page.request.delete(`/api/admin/collection/${id}`, { headers });
  }
});

test("private and deleted images cannot be downloaded or retained through the image optimizer", async ({ request, playwright, baseURL }) => {
  if (!password || !baseURL) throw new Error("Run through npm run review -- test.");
  const headers = { origin: baseURL ?? "" };
  await request.post("/api/admin/login", { headers, data: { password } });
  const anonymous = await playwright.request.newContext({ baseURL });
  const png = await sharp({ create: { width: 100, height: 100, channels: 3, background: "#d8dcd3" } }).png().toBuffer();
  const upload = await request.post("/api/admin/images", { headers, multipart: { file: { name: "private.png", mimeType: "image/png", buffer: png } } });
  expect(upload.status()).toBe(200);
  const image: string = (await upload.json()).data.images[0];
  const input = { kind: "artwork", title: "검증용 비공개 이미지", images: [image], is_active: 0 };
  const ids: number[] = [];
  let noticeId: number | undefined;
  try {
    expect((await anonymous.get(image)).status()).toBe(404);
    expect((await request.get(image)).status()).toBe(200);
    const created = await request.post("/api/admin/collection", { headers, data: input });
    expect(created.status()).toBe(201);
    const id: number = (await created.json()).data.id;
    ids.push(id);
    expect((await anonymous.get(image)).status()).toBe(404);
    expect((await request.put(`/api/admin/collection/${id}`, { headers, data: { ...input, is_active: 1 } })).status()).toBe(200);
    const publicImage = await anonymous.get(image);
    expect(publicImage.status()).toBe(200);
    expect(publicImage.headers()["cache-control"]).toContain("no-store");
    expect((await anonymous.get(`/_next/image?url=${encodeURIComponent(image)}&w=640&q=75`)).status()).toBe(400);
    const shared = await request.post("/api/admin/collection", { headers, data: { ...input, is_active: 1 } });
    expect(shared.status()).toBe(201);
    const sharedId: number = (await shared.json()).data.id;
    ids.push(sharedId);
    expect((await request.put(`/api/admin/collection/${id}`, { headers, data: input })).status()).toBe(200);
    expect((await anonymous.get(image)).status()).toBe(200);
    expect((await request.delete(`/api/admin/collection/${sharedId}`, { headers })).status()).toBe(200);
    expect((await anonymous.get(image)).status()).toBe(404);
    expect((await request.put(`/api/admin/collection/${id}`, { headers, data: { ...input, images: [], description: `![사진][photo]\n\n[photo]: ${image}`, is_active: 0 } })).status()).toBe(200);
    expect((await anonymous.get(image)).status()).toBe(404);
    expect((await request.delete(`/api/admin/collection/${id}`, { headers })).status()).toBe(200);
    expect((await anonymous.get(image)).status()).toBe(404);
    const notice = { slug: `image-check-${randomUUID()}`, title: "검증용 본문 사진", description: `![사진][photo]\n\n[photo]: ${image}`, is_active: 1 };
    const publishedNotice = await request.post("/api/admin/notices", { headers, data: notice });
    expect(publishedNotice.status()).toBe(201);
    noticeId = (await publishedNotice.json()).data.id;
    expect((await anonymous.get(image)).status()).toBe(200);
    expect((await request.put(`/api/admin/notices/${noticeId}`, { headers, data: { ...notice, is_active: 0 } })).status()).toBe(200);
    expect((await anonymous.get(image)).status()).toBe(404);
  } finally {
    for (const id of ids) await request.delete(`/api/admin/collection/${id}`, { headers });
    if (noticeId) await request.delete(`/api/admin/notices/${noticeId}`, { headers });
    await anonymous.dispose();
  }
});
