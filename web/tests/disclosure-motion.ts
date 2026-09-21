import { expect, type Locator, type Page, type TestInfo } from "@playwright/test";

export async function inspectSlide(page: Page, region: Locator, trigger: () => Promise<unknown>, name: string, info: TestInfo) {
  const settle = async () => page.evaluate(async () => {
    for (let pass = 0; pass < 2; pass++) {
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      document.getAnimations().filter(animation => animation.effect?.getTiming().iterations !== Infinity).forEach(animation => animation.finish());
    }
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
  });
  const height = () => region.evaluate(element => element.getBoundingClientRect().height);
  const frame = async (state: string) => {
    await page.screenshot({ path: info.outputPath(`${name}-${state}.png`) });
  };
  const pause = async () => region.evaluate(async element => {
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    const animations = element.getAnimations({ subtree: true });
    for (const animation of animations) {
      animation.pause();
      const duration = animation.effect?.getTiming().duration;
      if (typeof duration === "number") animation.currentTime = duration * 0.4;
    }
    return animations.length;
  });
  const finish = () => region.evaluate(element => element.getAnimations({ subtree: true }).forEach(animation => animation.finish()));
  await settle();
  await frame("closed");
  const closed = await height();
  await trigger();
  expect(await pause()).toBeGreaterThan(0);
  const opening = await height();
  await frame("opening");
  await finish();
  await settle();
  await expect.poll(height).toBeGreaterThan(opening);
  const opened = await height();
  expect(opening).toBeGreaterThan(closed);
  await frame("open");
  await trigger();
  expect(await pause()).toBeGreaterThan(0);
  const closing = await height();
  expect(closing).toBeGreaterThan(closed);
  expect(closing).toBeLessThan(opened);
  await frame("closing");
  await finish();
  await settle();
  await expect.poll(height).toBe(closed);
  await frame("closed-again");
  await info.attach(`${name}-heights`, { body: JSON.stringify({ closed, opening, opened, closing, settled: await height() }), contentType: "application/json" });
}
