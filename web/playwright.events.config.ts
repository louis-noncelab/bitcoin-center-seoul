import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests", testMatch: /(?:events-(?:api|admin|public)|wallet-guide|notices|browser-security)\.spec\.ts/,
  fullyParallel: false, workers: 1, forbidOnly: true, retries: 0, reporter: "list",
  use: { baseURL: "http://127.0.0.1:3102", trace: "off", screenshot: "off", video: "off" },
  projects: [{ name: "events-chrome", use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 1280, height: 900 } } }],
});
