import { expect, type Locator, type Page, type TestInfo } from "@playwright/test";

export async function inspectSlide(page: Page, region: Locator, trigger: () => Promise<unknown>, name: string, info: TestInfo) {
  const settle = async () => page.evaluate(async () => {
    const animations = document.getAnimations().filter(animation => animation.playState !== "finished" && animation.effect?.getTiming().iterations !== Infinity);
    await Promise.all(animations.map(animation => new Promise<void>(resolve => {
      animation.addEventListener("finish", () => resolve(), { once: true });
      animation.finish();
    })));
  });
  const height = () => region.evaluate(element => element.getBoundingClientRect().height);
  const frame = async (state: string) => {
    await page.screenshot({ path: info.outputPath(`${name}-${state}.png`) });
  };
  const capture = () => region.evaluate(element => {
    element.removeAttribute("data-test-slide-animations");
    const pauseAnimations = (animations: Animation[]) => {
      for (const animation of animations) {
        animation.pause();
        const duration = animation.effect?.getTiming().duration;
        if (typeof duration === "number") animation.currentTime = duration * 0.4;
      }
      element.setAttribute("data-test-slide-animations", String(animations.length));
    };
    const content = element.querySelector<HTMLElement>(".sliding-details-content");
    if (content) {
      const original = content.animate;
      content.animate = (frames, options) => {
        const animation = original.call(content, frames, options);
        content.animate = original;
        pauseAnimations([animation]);
        return animation;
      };
    } else {
      const started = (event: Event) => {
        if (!(event instanceof TransitionEvent) || event.target !== element || event.propertyName !== "grid-template-rows") return;
        element.removeEventListener("transitionrun", started);
        pauseAnimations(element.getAnimations({ subtree: true }));
      };
      element.addEventListener("transitionrun", started);
    }
  });
  const paused = async () => {
    await expect(region).toHaveAttribute("data-test-slide-animations", /^[1-9]\d*$/);
    return Number(await region.getAttribute("data-test-slide-animations"));
  };
  const finish = () => region.evaluate(async element => {
    const animations = element.getAnimations({ subtree: true }).filter(animation => animation.playState !== "finished");
    await Promise.all(animations.map(animation => new Promise<void>(resolve => {
      animation.addEventListener("finish", () => resolve(), { once: true });
      animation.finish();
    })));
  });
  await settle();
  await frame("closed");
  const closed = await height();
  await capture();
  await trigger();
  expect(await paused()).toBeGreaterThan(0);
  const opening = await height();
  await frame("opening");
  await finish();
  await settle();
  expect(await height()).toBeGreaterThan(opening);
  const opened = await height();
  expect(opening).toBeGreaterThan(closed);
  await frame("open");
  await capture();
  await trigger();
  expect(await paused()).toBeGreaterThan(0);
  const closing = await height();
  expect(closing).toBeGreaterThan(closed);
  expect(closing).toBeLessThan(opened);
  await frame("closing");
  await finish();
  await settle();
  expect(await height()).toBe(closed);
  await frame("closed-again");
  await info.attach(`${name}-heights`, { body: JSON.stringify({ closed, opening, opened, closing, settled: await height() }), contentType: "application/json" });
}
