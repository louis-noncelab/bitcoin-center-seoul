import assert from "node:assert/strict";
import test from "node:test";
import { fullPhone, phoneEntry, phoneCountries } from "../src/components/commerce/phone-number.ts";
import { customerSchema } from "../src/server/orders/validation.ts";

test("international paste produces one calling code and preserves national leading zero", () => {
  const korean = phoneEntry("+821012345678", "KR");
  assert.deepEqual(korean, { country: "KR", national: "1012345678" });
  assert.equal(fullPhone(korean.country, korean.national), "+82 1012345678");

  const spaced = phoneEntry("+82 010-1234-5678", "US");
  assert.deepEqual(spaced, { country: "KR", national: "010-1234-5678" });
  assert.equal(fullPhone(spaced.country, spaced.national), "+82 010-1234-5678");

  const internationalAccess = phoneEntry("0082 010-1234-5678", "US");
  assert.equal(fullPhone(internationalAccess.country, internationalAccess.national), "+82 010-1234-5678");

  const italian = phoneEntry("+39 02 12345678", "KR");
  assert.deepEqual(italian, { country: "IT", national: "02 12345678" });
  assert.equal(fullPhone(italian.country, italian.national), "+39 02 12345678");
});

test("unknown pasted calling codes are not silently saved under another country", () => {
  const unknown = phoneEntry("+999 12345678", "KR");
  assert.equal(unknown.national, "+999 12345678");
  assert.equal(fullPhone(unknown.country, unknown.national), "");
});

test("optional blank phone and meaningful international phone pass server validation", () => {
  const customer = { name: "Test Buyer", email: "buyer@example.invalid" };
  assert.equal(customerSchema.parse({ ...customer, phone: "" }).phone, "");
  assert.equal(customerSchema.parse({ ...customer, phone: "+39 02 12345678" }).phone, "+39 02 12345678");
  assert.equal(customerSchema.parse({ ...customer, phone: "+390212345678" }).phone, "+390212345678");
  assert.equal(customerSchema.parse({ ...customer, phone: "+821012345678" }).phone, "+821012345678");
  assert.equal(customerSchema.parse({ ...customer, phone: "+82 123456" }).phone, "+82 123456");
  assert.equal(customerSchema.parse({ ...customer, phone: "+358 123456" }).phone, "+358 123456");
  assert.equal(customerSchema.parse({ ...customer, phone: "+358123456" }).phone, "+358123456");
  assert.equal(customerSchema.parse({ ...customer, phone: "+1 242 5551234" }).phone, "+1 242 5551234");
  assert.equal(customerSchema.parse({ ...customer, phone: "010123456" }).phone, "010123456");
  for (const phone of ["+", "....", "++821012345678", "+82 123", "+82 1234", "+821234", "+358 12345", "+35812345", "+1 242 12345", "+124212345", "+999123456789"]) {
    assert.equal(customerSchema.safeParse({ ...customer, phone }).success, false, phone);
  }
});

test("country selector includes international destinations with bilingual search data", () => {
  const options = phoneCountries("en");
  assert.equal(options[0]?.code, "KR");
  assert.equal(options.find((item) => item.code === "IT")?.dial, "+39");
  assert.ok(options.find((item) => item.code === "US")?.search.includes("united states"));
});
