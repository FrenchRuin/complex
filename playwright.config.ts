import { defineConfig, devices } from "@playwright/test";
import { allowedEmailsForE2E, E2E_CRON_SECRET } from "./e2e/support/accounts";

const PORT = 3100;

/**
 * 주요 흐름 E2E (M3~). 실행: pnpm test:e2e
 * - 클라우드 Supabase에 E2E 계정 두 개를 만들고, 끝나면 데이터와 함께 지운다.
 * - 이 컴퓨터에 설치된 Chrome을 쓴다 (브라우저 따로 내려받지 않음).
 */
export default defineConfig({
  testDir: "e2e",
  // DB를 같이 쓰므로 한 번에 하나씩
  workers: 1,
  fullyParallel: false,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  globalSetup: "./e2e/support/global-setup.ts",
  globalTeardown: "./e2e/support/global-teardown.ts",
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: "chrome",
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 1280, height: 800 } },
      testIgnore: /mobile\.spec\.ts/,
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"], channel: "chrome" },
      testMatch: /mobile\.spec\.ts/,
    },
  ],
  webServer: {
    command: `pnpm exec next dev --port ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { ALLOWED_EMAILS: allowedEmailsForE2E(), CRON_SECRET: E2E_CRON_SECRET },
  },
});
