import { deleteContentFixture } from "./content-cleanup";
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
    expect((await request.delete(`/api/admin/collection/${draft.id}`, { headers: { ...headers, "If-Match": `"${draft.revision}"` } })).status()).toBe(200);
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
  await expect(page.getByRole("heading", { name: "도서·작품·보드게임 목록" })).toBeVisible();
  try {
    await page.getByRole("button", { name: "항목 등록", exact: true }).click();
    await page.getByRole("radio", { name: "작품", exact: true }).check();
    await page.getByLabel("제목", { exact: true }).fill(title);
    await page.getByLabel("저자·제작사 (선택)", { exact: true }).fill("검증용 작가");
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
    const { id: savedId, created_at, updated_at, revision, ...input } = item;
    expect(savedId).toBe(id); expect(created_at).toBeTruthy(); expect(updated_at).toBeTruthy();
    expect((await page.request.put(`/api/admin/collection/${id}`, { headers: { ...headers, "If-Match": `"${revision}"` }, data: { ...input, images: [item.images[0], item.images[0]] } })).status()).toBe(400);
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
    await page.getByRole("dialog", { name: "항목 삭제", exact: true }).getByRole("button", { name: "삭제", exact: true }).click();
    await expect(page.getByText("삭제했습니다.", { exact: true })).toBeVisible();
    expect((await page.request.get(`/api/collection/${id}`)).status()).toBe(404);
    id = undefined;
  } finally {
    if (id) await deleteContentFixture(page.request, `/api/admin/collection/${id}`, baseURL ?? "");
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
    const record = (await created.json()).data;
    const id: number = record.id;
    let revision: number = record.revision;
    ids.push(id);
    expect((await anonymous.get(image)).status()).toBe(404);
    expect((await request.put(`/api/admin/collection/${id}`, { headers: { ...headers, "If-Match": `"${revision++}"` }, data: { ...input, is_active: 1 } })).status()).toBe(200);
    const publicImage = await anonymous.get(image);
    expect(publicImage.status()).toBe(200);
    expect(publicImage.headers()["cache-control"]).toContain("no-store");
    expect((await anonymous.get(`/_next/image?url=${encodeURIComponent(image)}&w=640&q=75`)).status()).toBe(400);
    const shared = await request.post("/api/admin/collection", { headers, data: { ...input, is_active: 1 } });
    expect(shared.status()).toBe(201);
    const sharedRecord = (await shared.json()).data;
    const sharedId: number = sharedRecord.id;
    ids.push(sharedId);
    expect((await request.put(`/api/admin/collection/${id}`, { headers: { ...headers, "If-Match": `"${revision++}"` }, data: input })).status()).toBe(200);
    expect((await anonymous.get(image)).status()).toBe(200);
    expect((await request.delete(`/api/admin/collection/${sharedId}`, { headers: { ...headers, "If-Match": `"${sharedRecord.revision}"` } })).status()).toBe(200);
    expect((await anonymous.get(image)).status()).toBe(404);
    expect((await request.put(`/api/admin/collection/${id}`, { headers: { ...headers, "If-Match": `"${revision++}"` }, data: { ...input, images: [], description: `![사진][photo]\n\n[photo]: ${image}`, is_active: 0 } })).status()).toBe(200);
    expect((await anonymous.get(image)).status()).toBe(404);
    expect((await request.delete(`/api/admin/collection/${id}`, { headers: { ...headers, "If-Match": `"${revision}"` } })).status()).toBe(200);
    expect((await anonymous.get(image)).status()).toBe(404);
    const notice = { slug: `image-check-${randomUUID()}`, title: "검증용 본문 사진", description: `![사진][photo]\n\n[photo]: ${image}`, is_active: 1 };
    const publishedNotice = await request.post("/api/admin/notices", { headers, data: notice });
    expect(publishedNotice.status()).toBe(201);
    const noticeRecord = (await publishedNotice.json()).data;
    noticeId = noticeRecord.id;
    expect((await anonymous.get(image)).status()).toBe(200);
    expect((await request.put(`/api/admin/notices/${noticeId}`, { headers: { ...headers, "If-Match": `"${noticeRecord.revision}"` }, data: { ...notice, is_active: 0 } })).status()).toBe(200);
    expect((await anonymous.get(image)).status()).toBe(404);
  } finally {
    for (const id of ids) await deleteContentFixture(request, `/api/admin/collection/${id}`, baseURL ?? "");
    if (noticeId) await deleteContentFixture(request, `/api/admin/notices/${noticeId}`, baseURL ?? "");
    await anonymous.dispose();
  }
});

test("board games publish to their own page and stay out of the books & art collection", async ({ request, baseURL }) => {
  if (!password) throw new Error("Run through npm run review -- test.");
  const headers = { origin: baseURL ?? "" };
  await request.post("/api/admin/login", { headers, data: { password } });
  const png = await sharp({ create: { width: 400, height: 300, channels: 3, background: "#e8d8c3" } }).png().toBuffer();
  const upload = await request.post("/api/admin/images", { headers, multipart: { file: { name: "boardgame.png", mimeType: "image/png", buffer: png } } });
  expect(upload.status()).toBe(200);
  const image: string = (await upload.json()).data.images[0];
  const title = `검증용 보드게임 ${randomUUID()}`;
  const created = await request.post("/api/admin/collection", { headers, data: { kind: "boardgame", slug: `board-game-${randomUUID().slice(0, 8)}`, title, images: [image], is_active: 1 } });
  expect(created.status()).toBe(201);
  const record = z.object({ data: collectionRecordSchema }).parse(await created.json()).data;
  try {
    const list = await request.get("/ko/experience/board-game");
    expect(list.status()).toBe(200);
    expect(await list.text()).toContain(title);
    expect(await (await request.get("/ko/collection")).text()).not.toContain(title);
    expect((await request.get(`/ko/experience/board-game/${record.slug}`)).status()).toBe(200);
    expect((await request.get(`/ko/experience/board-game/${record.id}`, { maxRedirects: 0 })).status()).toBe(308);
    expect((await request.get(`/ko/collection/${record.id}`)).status()).toBe(404);
    const map = await (await request.get("/sitemap.xml")).text();
    expect(map).toContain(`/experience/board-game/${record.slug}</loc>`);
    expect(map).not.toContain(`/collection/${record.id}</loc>`);
  } finally {
    await deleteContentFixture(request, `/api/admin/collection/${record.id}`, baseURL ?? "");
  }
});

test("전시 페이지는 도서·작품, 보드게임, 하드웨어 지갑 체험 순으로 안내한다", async ({ page }) => {
  await page.goto("/ko/experience");
  const cards = page.locator(".experience-gallery > *");
  await expect(cards).toHaveCount(3);
  await expect(cards.locator("strong")).toHaveText(["도서·작품", "보드게임", "하드웨어 지갑 체험"]);
  await expect(cards.nth(1).getByRole("link", { name: "보드게임 둘러보기", exact: true })).toHaveAttribute("href", "/ko/experience/board-game");
  await expect(cards.nth(1).getByRole("img", { name: "흰색 선반에 놓인 비트코인 보드게임", exact: true })).toBeVisible();
});

test("관리자가 보드게임을 등록하면 보드게임 페이지에만 공개된다", async ({ page, baseURL }) => {
  if (!password) throw new Error("Run through npm run review -- test.");
  const title = `검증용 보드게임 ${randomUUID()}`;
  let id: number | undefined;
  const image = await sharp({ create: { width: 400, height: 600, channels: 3, background: "#d8dcd3" } }).png().toBuffer();
  await page.goto("/ko/admin/collection");
  await page.getByLabel("관리자 비밀번호", { exact: true }).fill(password);
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(page.getByRole("heading", { name: "도서·작품·보드게임 목록" })).toBeVisible();
  try {
    await page.getByRole("button", { name: "항목 등록", exact: true }).click();
    await page.getByRole("radio", { name: "보드게임", exact: true }).check();
    await page.getByLabel("제목", { exact: true }).fill(title);
    await page.getByLabel("URL 슬러그 (공개 보드게임 필수)", { exact: true }).fill(`board-game-${randomUUID().slice(0, 8)}`);
    await page.locator('.events-gallery-field input[type="file"]').setInputFiles([{ name: "boardgame.png", mimeType: "image/png", buffer: image }]);
    await expect(page.locator(".events-gallery-editor img")).toHaveCount(1);
    await page.getByLabel("공개", { exact: true }).check();
    await page.getByRole("button", { name: "저장", exact: true }).click();
    await expect(page.getByText("저장했습니다.", { exact: true })).toBeVisible();
    const item = listSchema.parse(await (await page.request.get("/api/admin/collection")).json()).data.find((record) => record.title === title);
    if (!item) throw new Error("Saved collection item missing.");
    id = item.id;
    expect(item).toMatchObject({ kind: "boardgame", is_active: 1 });
    await page.goto("/ko/experience/board-game");
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
    await page.goto("/ko/collection");
    await expect(page.getByRole("heading", { name: title, exact: true })).toHaveCount(0);
    await page.goto("/ko/admin/collection");
    const row = page.locator(".events-admin-list > li").filter({ hasText: title });
    await row.getByRole("button", { name: "삭제", exact: true }).click();
    await page.getByRole("dialog", { name: "항목 삭제", exact: true }).getByRole("button", { name: "삭제", exact: true }).click();
    await expect(page.getByText("삭제했습니다.", { exact: true })).toBeVisible();
    id = undefined;
  } finally {
    if (id) await deleteContentFixture(page.request, `/api/admin/collection/${id}`, baseURL ?? "");
  }
});
