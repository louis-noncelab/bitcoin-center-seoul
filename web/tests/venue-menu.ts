import { expect, type Page } from "@playwright/test";

const labels = { center: "센터", external: "외부 장소" } as const;

export function venueField(page: Page) {
  return page.locator("label").filter({ has: page.locator('input[name="venueType"]') });
}

export async function expectVenue(page: Page, value: keyof typeof labels) {
  const field = venueField(page);
  await expect(field.locator('input[name="venueType"]')).toHaveValue(value);
  await expect(field.getByRole("button")).toContainText(labels[value]);
}

export async function chooseVenue(page: Page, value: keyof typeof labels) {
  const field = venueField(page);
  const input = field.locator('input[name="venueType"]');
  if ((await input.inputValue()) === value) return;
  await field.getByRole("button").click();
  await field.getByRole("option", { name: labels[value], exact: true }).click();
  await expect(input).toHaveValue(value);
}
