import { defineConfig } from "@playwright/test";
const baseURL = process.env.TEST_ORIGIN ?? "http://localhost:3001";
if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(baseURL))
  throw new Error("Browser tests require an isolated local application");
export default defineConfig({
  testDir: "./tests/browser",
  timeout: 60000,
  expect: { timeout: 15000 },
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  webServer:
    process.env.PLAYWRIGHT_START_SERVER === "1"
      ? {
          command: "npx wrangler dev --local --ip 127.0.0.1 --port 8788",
          url: baseURL + "/api/health",
          reuseExistingServer: false,
          timeout: 120000,
        }
      : undefined,
  use: {
    baseURL,
    headless: true,
    viewport: { width: 1440, height: 1000 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    launchOptions: {
      executablePath: process.env.CHROMIUM_EXECUTABLE,
      args: [
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--enable-unsafe-swiftshader",
      ],
    },
  },
});
