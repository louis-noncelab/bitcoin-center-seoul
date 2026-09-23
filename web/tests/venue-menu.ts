import { expect, type Page } from "@playwright/test";

const labels = { center: "센터", external: "외부 장소" } as const;

export function venueField(page: Page) {
  return page.locator("label").filter({ has: page.locator('select[name="venueType"]') });
}

export async function expectVenue(page: Page, value: keyof typeof labels) {
  const field = venueField(page);
  await expect(field.locator('select[name="venueType"]')).toHaveValue(value);
  await expect(field.getByRole("combobox").locator("option:checked")).toContainText(labels[value]);
}

export async function chooseVenue(page: Page, value: keyof typeof labels) {
  const field = venueField(page);
  const input = field.locator('select[name="venueType"]');
  if ((await input.inputValue()) === value) return;
  await input.selectOption(value);
  await expect(input).toHaveValue(value);
}
