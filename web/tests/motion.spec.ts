import { expect, test } from "@playwright/test";

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test(`scroll entrance respects CSS timing and motion preference: ${reducedMotion}`, async ({ page }) => {
    // Given a section with a heading and six gallery entrance groups.
    await page.emulateMedia({ reducedMotion });
    await page.goto("/ko/about");
    await page.evaluate(() => document.fonts.ready);
    const section = page.locator(".about-gallery");
    const parts = section.locator("[data-reveal-part]");
    await expect(parts).toHaveCount(7);

    // When the section enters the viewport.
    await section.evaluate((element) => element.scrollIntoView({ behavior: "instant", block: "start" }));

    // Then only its groups move, in order, unless motion is reduced.
    if (reducedMotion === "reduce") {
      expect(await section.evaluate((element) => element.getAnimations({ subtree: true }).length)).toBe(0);
    } else {
      await expect.poll(() => parts.evaluateAll((elements) => elements.map((element) => {
        const timing = element.getAnimations()[0]?.effect?.getTiming();
        return { duration: timing?.duration, delay: timing?.delay };
      })), { timeout: 2000, intervals: [10, 20, 40] }).toEqual([
        { duration: 600, delay: 0 },
        { duration: 600, delay: 80 },
        { duration: 600, delay: 160 },
        { duration: 600, delay: 160 },
        { duration: 600, delay: 160 },
        { duration: 600, delay: 160 },
        { duration: 600, delay: 160 },
      ]);
    }
    expect(await section.evaluate((element) => element.getAnimations().length)).toBe(0);
    for (const part of await parts.all()) {
      await expect(part).toHaveCSS("opacity", "1");
      await expect(part).toHaveCSS("transform", "none");
    }
  });
}

test("entrance delay stops growing after 160ms", async ({ page }) => {
  // Given the gallery heading and its six photographs.
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/en/about");
  await page.evaluate(() => document.fonts.ready);
  const section = page.locator(".about-gallery");
  await expect(section.locator("[data-reveal-part]")).toHaveCount(7);

  // When that scene enters the viewport.
  await section.evaluate((element) => element.scrollIntoView({ behavior: "instant", block: "start" }));

  // Then the final group shares the maximum delay instead of extending the wait.
  await expect.poll(() => section.locator("[data-reveal-part]").evaluateAll((elements) =>
    elements.map((element) => element.getAnimations()[0]?.effect?.getTiming().delay),
  ), { timeout: 2000, intervals: [10, 20, 40] }).toEqual([0, 80, 160, 160, 160, 160, 160]);
});

test("unmarked sections keep their single entrance", async ({ page }) => {
  // Given a section using the original unmarked anatomy.
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/ko/about");
  const section = page.locator(".about-reviews-link");
  await expect(section.locator("[data-reveal-part]")).toHaveCount(0);

  // When it enters the viewport.
  await section.evaluate((element) => element.scrollIntoView({ behavior: "instant", block: "start" }));

  // Then the section retains the same duration without a stagger.
  await expect.poll(() => section.evaluate((element) => {
    const timing = element.getAnimations()[0]?.effect?.getTiming();
    return { duration: timing?.duration, delay: timing?.delay };
  }), { timeout: 2000, intervals: [10, 20, 40] }).toEqual({ duration: 600, delay: 0 });
});

test("reduced-motion changes cancel entrances and stop observing new sections", async ({ page }) => {
  // Given active group entrances paused so their cleanup cannot pass by timeout.
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/ko/about");
  const section = page.locator(".about-gallery");
  await section.evaluate((element) => element.scrollIntoView({ behavior: "instant", block: "start" }));
  await expect.poll(() => section.evaluate((element) => {
    const animations = element.getAnimations({ subtree: true });
    animations.forEach((animation) => animation.pause());
    return animations.length;
  }), { timeout: 2000, intervals: [10, 20, 40] }).toBe(7);

  // When the visitor requests reduced motion while the groups are active.
  await page.emulateMedia({ reducedMotion: "reduce" });

  // Then active effects are cancelled and a later preference change cannot restart the observer.
  await expect.poll(() => section.evaluate((element) => element.getAnimations({ subtree: true }).length)).toBe(0);
  for (const part of await section.locator("[data-reveal-part]").all()) {
    await expect(part).toHaveCSS("opacity", "1");
    await expect(part).toHaveCSS("transform", "none");
  }
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const untouched = page.locator(".about-reviews-link");
  await untouched.evaluate((element) => element.scrollIntoView({ behavior: "instant", block: "start" }));
  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));
  expect(await untouched.evaluate((element) => element.getAnimations({ subtree: true }).length)).toBe(0);
});

test("mobile parts enter once when each reaches the viewport", async ({ page }) => {
  // Given a mobile scene whose final photograph is below the first visible group.
  await page.setViewportSize({ width: 375, height: 667 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/en/about");
  await page.evaluate(() => document.fonts.ready);
  const section = page.locator(".about-gallery");
  const first = section.locator("[data-reveal-part]").first();
  const last = section.locator("[data-reveal-part]").last();

  // When the visitor reaches the scene, then continues down to its final photograph.
  await first.evaluate((element) => window.scrollTo({
    top: scrollY + element.getBoundingClientRect().top - innerHeight + 120,
    behavior: "instant",
  }));
  await expect(first).toBeInViewport();
  await expect(last).not.toBeInViewport();
  await expect.poll(() => first.evaluate((element) => {
    const animation = element.getAnimations()[0];
    animation?.pause();
    return animation?.effect?.getTiming().duration;
  }), { timeout: 2000, intervals: [10, 20, 40] }).toBe(600);
  expect(await last.evaluate((element) => element.getAnimations().length)).toBe(0);
  await last.evaluate((element) => element.scrollIntoView({ behavior: "instant", block: "center" }));

  // Then the newly visible photograph gets its own entrance with a stable delay.
  await expect.poll(() => last.evaluate((element) => {
    const animation = element.getAnimations()[0];
    animation?.pause();
    const timing = animation?.effect?.getTiming();
    return { duration: timing?.duration, delay: timing?.delay };
  }), { timeout: 2000, intervals: [10, 20, 40] }).toEqual({ duration: 600, delay: 160 });
  await last.evaluate((element) => element.getAnimations().forEach((animation) => animation.finish()));
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect(last).not.toBeInViewport();
  await last.evaluate((element) => element.scrollIntoView({ behavior: "instant", block: "center" }));
  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));
  expect(await last.evaluate((element) => element.getAnimations().length)).toBe(0);
});
