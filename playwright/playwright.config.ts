import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./test",
  timeout: 60_000,
  retries: process.env.CI ? 2 : 1,
  use: {
    headless: false,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
});
