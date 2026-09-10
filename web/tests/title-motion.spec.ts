import { expect, test } from "@playwright/test";

for (const locale of ["ko", "en"] as const) {
  test(`${locale} title assembles in place while retaining its complete accessible name`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(`/${locale}`);
    await page.evaluate(() => document.fonts.ready);
    const title = page.locator("#hero-title");
    const name = locale === "ko" ? "비트코인 센터 서울" : "Bitcoin Center Seoul";
    await expect(title).toHaveAccessibleName(name);
    await expect(title).toHaveText(name);
    const before = await title.boundingBox();
    const timing = await title.locator(".hero-letter").evaluateAll((letters) => letters.map((letter) => {
      const animation = letter.getAnimations()[0];
      if (!animation) throw new Error("Missing letter entrance");
      animation.pause();
      animation.currentTime = 0;
      return animation.effect?.getTiming();
    }));
    expect(timing).toHaveLength(locale === "ko" ? 8 : 18);
    timing.forEach((entry, index) => {
      expect(entry?.duration).toBe(600);
      expect(entry?.delay).toBeCloseTo(index * 24, 5);
      expect(entry?.iterations).toBe(1);
    });
    expect(await title.evaluate((element) => element.getAnimations().length)).toBe(0);
    await expect(title).toHaveAccessibleName(name);
    const frame = await title.locator(".hero-letter").evaluateAll((letters) => letters.map((letter) => {
      const animation = letter.getAnimations()[0];
      if (!animation) throw new Error("Missing letter entrance");
      animation.currentTime = 120;
      const style = getComputedStyle(letter);
      return { opacity: Number(style.opacity), y: new DOMMatrix(style.transform).m42 };
    }));
    expect(frame[0]?.opacity).toBeGreaterThan(frame.at(-1)?.opacity ?? 1);
    expect(frame[0]?.y).toBeLessThan(frame.at(-1)?.y ?? 0);
    expect(await title.boundingBox()).toEqual(before);

    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect.poll(() => title.evaluate((element) => element.getAnimations({ subtree: true }).length)).toBe(0);
    for (const letter of await title.locator(".hero-letter").all()) {
      await expect(letter).toHaveCSS("opacity", "1");
      await expect(letter).toHaveCSS("transform", "none");
    }
    expect(await title.boundingBox()).toEqual(before);
    await page.reload();
    expect(await title.evaluate((element) => element.getAnimations({ subtree: true }).length)).toBe(0);
    await expect(title).toHaveAccessibleName(name);
  });
}
