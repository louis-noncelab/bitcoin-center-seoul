import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const origin = process.env.CERTIFICATE_BASE_URL ?? "http://127.0.0.1:3102";

for (const [series, count] of [["001", 5], ["002", 7]]) {
  for (let number = 1; number <= count; number++) {
    const filename = `BPEP-${series}-${String(number).padStart(4, "0")}.pdf`;
    test(`${filename} keeps its original bytes and unlisted direct URL`, async () => {
      const original = await readFile(new URL(`../../public/certificate/${filename}`, import.meta.url));
      const response = await fetch(`${origin}/certificate/${filename}`, { redirect: "manual" });
      assert.equal(response.status, 200);
      assert.match(response.headers.get("content-type"), /^application\/pdf/);
      const published = Buffer.from(await response.arrayBuffer());
      assert.deepEqual(published, original);
      assert.equal(response.headers.get("location"), null);
      assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow");
    });
  }
}

test("similarly named pages still use locale routing", async () => {
  const response = await fetch(`${origin}/certificate-other`, { redirect: "manual" });
  assert.equal(new URL(response.headers.get("location"), origin).pathname, "/ko/certificate-other");
});

test("certificate directory and unknown files have no listing or fallback PDF", async () => {
  for (const pathname of ["/certificate", "/certificate/BPEP-002-9999.pdf"]) {
    const response = await fetch(`${origin}${pathname}`, { redirect: "manual" });
    assert.equal(response.status, 404);
  }
});
