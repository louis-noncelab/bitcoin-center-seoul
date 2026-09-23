import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests", testMatch: /\.spec\.ts$/,
  outputDir: process.env.COMMERCE_REVIEW_ORIGIN ? ".local/docs-archive/fix-audit-20260923/playwright-results" : ".local/events-review/test-results",
  fullyParallel: false, workers: 1, forbidOnly: true, retries: 0, reporter: "list",
  use: { baseURL: process.env.COMMERCE_REVIEW_ORIGIN ?? "http://127.0.0.1:3102", trace: "off", screenshot: "off", video: "off" },
  projects: [{ name: "events-chrome", use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 1280, height: 900 } } }],
});
