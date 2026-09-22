import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "bcs-media-ingress-"));
const databaseUrl = process.env.TEST_DATABASE_URL;
assert.ok(databaseUrl, "Set TEST_DATABASE_URL to a disposable migrated local PostgreSQL database");
Object.assign(process.env, {
  APP_MODE: "test", APP_ORIGIN: "http://127.0.0.1:3146", DATABASE_URL: databaseUrl,
  DATA_DIR: root, TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 9).toString("base64"),
  PAYMENT_PROVIDER: "zaprite", PAYMENT_MODE: "review", EMAIL_MODE: "capture", TRUST_PROXY: "true",
  BCS_EVENTS_DB: path.join(root, "events.db"), BCS_EVENTS_UPLOADS: path.join(root, "images"),
});
const { getDatabase, openDatabase } = await import("../src/server/events/db.ts");
const { createPasswordHash } = await import("../src/server/events/password.ts");
const { publicImage } = await import("../src/server/events/handlers.ts");
const { prisma } = await import("../src/server/db.ts");
const { getClientKey } = await import("../src/server/http.ts");
const { parseServerConfig } = await import("../src/server/config.ts");
const slug = `media-${randomUUID()}`;
const cover = `/images/uploads/2026-09/${slug}.webp`;
const inline = `/images/uploads/2026-09/${slug}-inline.webp`;
let productId;

before(async () => {
  openDatabase(process.env.BCS_EVENTS_DB).close();
  process.env.ADMIN_PASSWORD_HASH = await createPasswordHash(randomUUID());
  fs.mkdirSync(path.join(root, "images/uploads/2026-09"), { recursive: true });
  for (const url of [cover, inline]) fs.writeFileSync(path.join(root, url.slice(1)), "private-fixture-image");
  const product = await prisma.product.create({ data: {
    slug, titleKo: "도서", titleEn: "Book", descriptionKo: `![사진][photo]\n\n[photo]: ${inline}`,
    descriptionEn: "", contentFormat: "MARKDOWN", imageUrl: cover,
    published: true, priceKind: "KRW_FIXED", priceAmount: 1000n, allowedFulfillments: ["PICKUP"],
  } });
  productId = product.id;
});
after(async () => {
  if (productId) await prisma.product.delete({ where: { id: productId } });
  await prisma.$disconnect();
  getDatabase().close();
  fs.rmSync(root, { recursive: true, force: true });
});
const imageRequest = (url) => publicImage(new NextRequest(`http://127.0.0.1:3146${url}`), {
  params: Promise.resolve({ path: url.slice("/images/".length).split("/") }),
});

test("published product cover and Markdown images are public; hiding the product revokes both", async () => {
  for (const url of [cover, inline]) assert.equal((await imageRequest(url)).status, 200);
  await prisma.product.update({ where: { id: productId }, data: { published: false } });
  for (const url of [cover, inline]) assert.equal((await imageRequest(url)).status, 404);
  const unreferenced = `/images/uploads/2026-09/${slug}-private.webp`;
  fs.writeFileSync(path.join(root, unreferenced.slice(1)), "private");
  assert.equal((await imageRequest(unreferenced)).status, 404);
});

test("commerce uses the ingress-owned identity, ignoring forged forwarding headers", () => {
  const request = (ip, extra = {}) => new Request("http://127.0.0.1:3146/api/orders", {
    headers: { "x-bcs-client-ip": ip, ...extra },
  });
  const first = getClientKey(request("192.0.2.1"));
  assert.notEqual(first, getClientKey(request("192.0.2.2")));
  assert.equal(first, getClientKey(request("192.0.2.1", { "x-real-ip": "192.0.2.99", "x-forwarded-for": "192.0.2.100" })));
  for (const ip of ["", "garbage", "192.0.2.1, 192.0.2.2"]) {
    assert.throws(() => getClientKey(request(ip)), (error) => error.code === "PROXY_REQUIRED");
  }
});

test("production refuses the shared unidentified-client fallback", () => {
  assert.throws(() => parseServerConfig({ ...process.env, APP_MODE: "production", APP_ORIGIN: "https://center.example", PAYMENT_MODE: "live", TRUST_PROXY: "false" }),
    (error) => error.fields.includes("TRUST_PROXY"));
});
