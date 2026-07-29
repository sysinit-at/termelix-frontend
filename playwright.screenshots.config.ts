import { defineConfig } from "@playwright/test";

/**
 * Website screenshot generator — not a test suite. Runs against the seeded local stack
 * (`termEX/scripts/e2e-stack.sh` + `seed-e2e.sh`) and writes marketing shots into
 * `screenshots/`. Kept out of `playwright.config.ts` so `npx playwright test` never runs it.
 *
 *   TERMELIX_E2E_URL=http://127.0.0.1:4321 npx playwright test -c playwright.screenshots.config.ts
 */
export default defineConfig({
  testDir: "./e2e-screenshots",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.TERMELIX_E2E_URL,
    ignoreHTTPSErrors: true,
    viewport: { width: 1600, height: 1000 },
    // 2x for retina-crisp website assets: shots come out 3200×2000.
    deviceScaleFactor: 2,
    colorScheme: "dark",
  },
});
