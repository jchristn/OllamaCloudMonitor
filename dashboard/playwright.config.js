import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./test/browser",
  timeout: 45000,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.MONITOR_TEST_URL ?? "http://127.0.0.1:8080",
    trace: "retain-on-failure",
  },
});
