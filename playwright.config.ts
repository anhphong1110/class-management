import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  workers: 1,
  use: { baseURL: "http://localhost:3000" },
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000/dang-nhap",
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: "mobile",
      use: { ...devices["Desktop Chrome"], userAgent: devices["Pixel 7"].userAgent, viewport: { width: 375, height: 812 } },
    },
    {
      name: "tablet",
      use: { ...devices["Desktop Chrome"], viewport: { width: 768, height: 1024 } },
    },
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
  ],
});
