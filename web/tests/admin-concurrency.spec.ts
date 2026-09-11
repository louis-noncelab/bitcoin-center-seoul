import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";

for (const kind of ["events", "highlights", "notices", "book", "artwork", "boardgame"] as const) {
  test(`${kind}: stale editor keeps its draft and can reopen the latest save`, async ({ browser, baseURL }) => {
    const password = process.env.ADMIN_PASSWORD;
    if (!password || !baseURL) throw new Error("Use npm run review -- test.");
    const endpoint = kind === "book" || kind === "artwork" || kind === "boardgame" ? "collection" : kind;
    const headers = { origin: baseURL };
    const a = await browser.newContext({ baseURL });
    const b = await browser.newContext({ baseURL });
    const errors: string[] = [];
    let id: number | undefined;
    try {
      for (const context of [a, b]) {
        expect((await context.request.post("/api/admin/login", { headers, data: { password } })).status()).toBe(200);
      }
      const title = `동시 편집 ${randomUUID()}`;
      const common = { title, titleEn: title, description: "설명", descriptionEn: "Description", date: "2026-09-10", images: [], image: "", link: "" };
      const data = kind === "events" ? { ...common, time: "", location: "", locationEn: "" }
        : kind === "highlights" ? { ...common, meta: "", metaEn: "", category: "", categoryEn: "", startDate: "", endDate: "", host: "", hostEn: "", icon: "", sort_order: 0, is_active: 0 }
        : kind === "notices" ? { title, description: "설명", slug: `review-${randomUUID()}`, is_active: 0 }
        : { kind, title, images: [], is_active: 0 };
      const created = await a.request.post(`/api/admin/${endpoint}`, { headers, data });
      expect(created.status()).toBe(201);
      id = (await created.json()).data.id;
      const pages = await Promise.all([a.newPage(), b.newPage()]);
      const titleLabel = kind === "events" || kind === "highlights" ? "제목 · 한국어" : "제목";
      for (const page of pages) {
        page.on("pageerror", error => errors.push(error.message));
        await page.goto(endpoint === "events" || endpoint === "highlights" ? "/ko/admin" : `/ko/admin/${endpoint}`);
        if (kind === "highlights") await page.getByRole("button", { name: "하이라이트", exact: true }).click();
        await page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: title, exact: true }) }).getByRole("button", { name: "수정", exact: true }).click();
      }
      const [first, stale] = pages;
      if (!first || !stale) throw new Error("Missing editor pages.");
      await first.getByLabel(titleLabel, { exact: true }).fill(`${title} A`);
      await stale.getByLabel(titleLabel, { exact: true }).fill(`${title} B`);
      await first.getByRole("button", { name: "저장", exact: true }).click();
      await expect(first.getByText("저장했습니다.", { exact: true })).toBeVisible();
      await stale.getByRole("button", { name: "저장", exact: true }).click();
      await expect(stale.getByRole("alert").filter({ hasText: "다른 사람이 먼저 수정했습니다." })).toContainText("다른 사람이 먼저 수정했습니다.");
      await expect(stale.getByLabel(titleLabel, { exact: true })).toHaveValue(`${title} B`);
      if (kind === "events") {
        await stale.setViewportSize({ width: 390, height: 844 });
        await stale.getByRole("alert").filter({ hasText: "다른 사람이 먼저 수정했습니다." }).scrollIntoViewIfNeeded();
        await stale.screenshot({ path: ".local/concurrency-mobile.png" });
        expect(await stale.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      }
      await stale.getByRole("button", { name: "취소", exact: true }).click();
      await stale.getByRole("dialog").getByRole("button", { name: "버리기", exact: true }).click();
      await stale.getByRole("listitem").filter({ has: stale.getByRole("heading", { name: `${title} A`, exact: true }) }).getByRole("button", { name: "수정", exact: true }).click();
      await expect(stale.getByLabel(titleLabel, { exact: true })).toHaveValue(`${title} A`);
      await stale.getByLabel(titleLabel, { exact: true }).fill(`${title} merged`);
      await stale.getByRole("button", { name: "저장", exact: true }).click();
      await expect(stale.getByText("저장했습니다.", { exact: true })).toBeVisible();
      expect(errors).toEqual([]);
    } finally {
      if (id !== undefined) {
        const records = (await (await a.request.get(`/api/admin/${endpoint}`)).json()).data;
        const current = records.find((item: { readonly id: number }) => item.id === id);
        if (current) expect((await a.request.delete(`/api/admin/${endpoint}/${id}`, { headers: { ...headers, "if-match": `"${current.revision}"` } })).status()).toBe(200);
      }
      await a.close(); await b.close();
    }
  });
}
