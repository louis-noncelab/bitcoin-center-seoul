import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { z } from "zod";

const runtimeSchema = z.object({ password: z.string() });

async function login(page: import("@playwright/test").Page, origin: string): Promise<void> {
  const credentials = process.env.COMMERCE_REVIEW_CREDENTIALS;
  if (!credentials) throw new Error("Set COMMERCE_REVIEW_CREDENTIALS to an isolated review runtime JSON file");
  const { password } = runtimeSchema.parse(JSON.parse(await readFile(credentials, "utf8")));
  const result = await page.request.post(`${origin}/api/admin/login`, { headers: { origin }, data: { password } });
  expect(result.status()).toBe(200);
}

test("meetup form confirms submission and shows capture deduplication", async ({ page, baseURL }) => {
  // Given an authenticated administrator and a paid meetup audience in capture mode.
  const origin = process.env.COMMERCE_REVIEW_ORIGIN ?? baseURL;
  if (!origin) throw new Error("Review origin is unset");
  await login(page, origin);
  const emptyReport = {
    mode: "capture", summary: "기록 모드입니다.",
    counts: { CAPTURED: 0, PENDING: 0, PROCESSING: 0, SENT: 0, FAILED: 0 },
    staleProcessing: 0, overduePending: 0, truncated: false, letters: [], failures: [],
  };
  await page.route("**/api/admin/email/meetups", (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: { data: { meetups: [{ id: 7, title: "QA 밋업", date: "2026-10-01", online: true, recipients: 2 }] } } });
    return route.continue();
  });
  await page.route("**/api/admin/email", (route) => route.fulfill({ json: { data: emptyReport } }));
  const submitted: unknown[] = [];
  await page.route("**/api/admin/email/meetups", (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    submitted.push(route.request().postDataJSON());
    const queued = submitted.length === 1 ? 2 : 0;
    return route.fulfill({ json: { data: { recipients: 2, queued, skipped: 2 - queued } } });
  });
  await page.goto(`${origin}/ko/admin/mail`);
  await page.getByRole("combobox", { name: "밋업" }).selectOption("7");
  await page.getByLabel("제목", { exact: true }).fill("내일 밋업 안내");
  await page.getByLabel("내용", { exact: true }).fill("일곱 시에 입장해 주세요.");

  // When the operator clicks send and confirms.
  await page.getByRole("button", { name: "안내 메일 보내기" }).click();
  const dialog = page.getByRole("dialog", { name: "밋업 안내 메일을 보낼까요?" });
  await expect(dialog).toBeVisible();
  expect(submitted).toHaveLength(0);
  await dialog.getByRole("button", { name: "보내기", exact: true }).click();
  // Then capture reports two queued, and a repeated send reports two skipped.
  await expect(page.getByRole("status").filter({ hasText: "2명에게 넣었습니다" })).toBeVisible();
  expect(submitted).toEqual([{ eventId: 7, subject: "내일 밋업 안내", message: "일곱 시에 입장해 주세요." }]);
  await page.getByRole("button", { name: "안내 메일 보내기" }).click();
  await dialog.getByRole("button", { name: "보내기", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "이미 보낸 주소만" })).toBeVisible();
  expect(submitted).toHaveLength(2);
});

test("records sidebar opens an authenticated Korean audit log", async ({ page, baseURL }) => {
  // Given an authenticated administrator on the mail page.
  const origin = process.env.COMMERCE_REVIEW_ORIGIN ?? baseURL;
  if (!origin) throw new Error("Review origin is unset");
  await login(page, origin);
  await page.goto(`${origin}/ko/admin/mail`);
  // When the records entry is selected.
  await page.getByRole("navigation", { name: "관리자 메뉴" }).getByRole("link", { name: "기록", exact: true }).click();
  // Then the route and authenticated audit API both resolve.
  await expect(page).toHaveURL(`${origin}/ko/admin/logs`);
  await expect(page.getByRole("heading", { name: "관리 기록" })).toBeVisible();
  await expect(page.getByText("상품, 주문, 설정, 개인정보 파기 같은 관리자 작업의 최근 100건입니다.", { exact: false })).toBeVisible();
  expect((await page.request.get(`${origin}/api/admin/audit-logs`)).status()).toBe(200);
});

test("audit log asks a signed-out administrator to sign in", async ({ page, baseURL }) => {
  // Given a browser without an administrator session.
  const origin = process.env.COMMERCE_REVIEW_ORIGIN ?? baseURL;
  if (!origin) throw new Error("Review origin is unset");
  // When the audit-log page opens.
  await page.goto(`${origin}/ko/admin/logs`);
  // Then it offers the Korean login form and the audit API remains protected.
  await expect(page.getByLabel("관리자 비밀번호", { exact: true })).toBeVisible();
  expect((await page.request.get(`${origin}/api/admin/audit-logs`)).status()).toBe(401);
});

test("unpaid cancellation requires provider reference and cleared pending HTLCs", async ({ page, baseURL }) => {
  // Given an unpaid order with a resolved payment attempt.
  const origin = process.env.COMMERCE_REVIEW_ORIGIN ?? baseURL;
  if (!origin) throw new Error("Review origin is unset");
  await login(page, origin);
  const order = {
    id: "order-evidence", status: "EXPIRED", refundStatus: "NONE", customerName: "테스트", customerEmail: "qa@example.invalid", customerPhone: "", locale: "ko",
    amountSats: "1000", fulfillment: "PICKUP", fulfillmentStatus: "UNFULFILLED", address: null,
    shippingAmountSats: "0", carrier: null, trackingNumber: null, fulfilledAt: null, holdExpiresAt: null,
    createdAt: "2026-09-21T00:00:00.000Z", items: [], payments: [{ id: "payment-evidence", status: "EXPIRED", mode: "REVIEW", expiresAt: "2026-09-21T00:00:00.000Z", updatedAt: "2026-09-21T00:00:00.000Z", paidAt: null, creationUnknown: false }],
  };
  await page.route("**/api/admin/orders?*", (route) => route.fulfill({ json: { data: { items: [order], total: 1, page: 1, pageSize: 50 } } }));
  const posts: unknown[] = [];
  await page.route("**/api/admin/orders/order-evidence/payment", (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: { data: posts.length ? [{
      id: "audit-evidence", action: "order.payment.manual", actorId: "admin", createdAt: "2026-09-23T00:00:00.000Z",
      summary: { reason: "제공자 결제 내역 조회", decision: "CANCELLED", unpaidEvidence: { providerReference: "provider-check-2026-09-23", pendingHtlcsCleared: true } },
    }] : [] } });
    posts.push(route.request().postDataJSON());
    return route.fulfill({ json: { data: order } });
  });
  await page.goto(`${origin}/ko/admin/orders`);
  await page.getByRole("button", { name: "자세히", exact: true }).click();
  await page.getByLabel("수동 처리 사유").fill("제공자 결제 내역 조회");
  const cancel = page.getByRole("button", { name: "미입금 확인 후 취소" });
  await expect(cancel).toBeDisabled();

  // When the operator enters a provider reference and attests that no HTLC is pending.
  await page.getByLabel("제공자 조회 참조").fill("provider-check-2026-09-23");
  await expect(cancel).toBeDisabled();
  await page.getByLabel("제공자에서 입금 없음과 진행 중인 HTLC 없음 확인").check();
  await cancel.click();
  await page.getByRole("dialog", { name: "미입금 주문을 취소할까요?" }).getByRole("button", { name: "미입금 취소 확정" }).click();

  // Then only the cancellation request carries the evidence the server requires.
  await expect.poll(() => posts.length).toBe(1);
  expect(posts[0]).toEqual({
    paymentId: "payment-evidence", expectedPaymentUpdatedAt: "2026-09-21T00:00:00.000Z",
    reason: "제공자 결제 내역 조회", decision: "CANCELLED",
    unpaidEvidence: { providerReference: "provider-check-2026-09-23", pendingHtlcsCleared: true },
  });
  await expect(page.getByText("provider-check-2026-09-23")).toBeVisible();
  await expect(page.getByText("진행 중 HTLC 없음 확인됨")).toBeVisible();
});
