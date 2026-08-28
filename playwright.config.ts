import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  reporter: "line",
  use: { baseURL: "http://127.0.0.1:4173", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } }
  ],
  webServer: [
    {
      command: "npm run build:site && npx vite preview --config vite.site.config.ts --host 127.0.0.1",
      url: "http://127.0.0.1:4173",
      reuseExistingServer: false,
      timeout: 120_000
    },
    {
      command: "npm run build:app && npx vite preview --config vite.app.config.ts --host 127.0.0.1 --port 4174",
      url: "http://127.0.0.1:4174",
      reuseExistingServer: false,
      timeout: 120_000
    }
  ]
});
