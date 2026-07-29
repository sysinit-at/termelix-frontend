import { defineConfig } from "@playwright/test";

/**
 * End-to-end tests against a REAL Termelix server.
 *
 * `TERMELIX_E2E_URL` picks the target; there is no default, because a suite that silently
 * points at production when a variable is unset is a suite that will eventually do something
 * to production.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.TERMELIX_E2E_URL,
    ignoreHTTPSErrors: true,
    trace: "retain-on-failure",
  },
});
