import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for the end-to-end test.
 *
 * The test boots a real Next.js server (production build by default) against a
 * real database, then drives the full flow: create a catalog entry, build a
 * quote, and open the saved quote. A DATABASE_URL must be set and migrated
 * (`npm run prisma:deploy`) before running.
 */
const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Build once, then serve — closer to production than `next dev`.
    command: `npm run build && npm run start -- --port ${PORT}`,
    url: BASE_URL,
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
  },
});
