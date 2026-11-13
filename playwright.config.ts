import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

/**
 * E2E + visual tests run against a production build backed by a disposable database
 * (E2E_DATABASE_URL, else TEST_DATABASE_URL). The web server step resets, migrates and seeds that
 * database (fast demo media), builds, and starts the server on E2E_PORT (3100).
 * E2E_SKIP_BUILD=1 reuses the existing .next build; the database is still reset and seeded, but
 * pages cached by the previous run (ISR) are reused too, so run the visual project on a fresh build.
 * If a server is already listening on E2E_PORT it is reused as is (outside CI).
 */
const PORT = Number(process.env.E2E_PORT ?? 3100);
const DB = process.env.E2E_DATABASE_URL ?? process.env.TEST_DATABASE_URL ?? "";
const env = {
  DATABASE_URL: DB,
  NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}`,
  SESSION_SECRET: process.env.SESSION_SECRET ?? "e2e-secret-e2e-secret-e2e-secret-e2e-1234",
  ADMIN_EMAIL: "admin@example.com",
  ADMIN_PASSWORD: "ChangeMe!2026",
  MEDIA_DRIVER: "local",
  LOCAL_UPLOAD_DIR: "./storage/e2e-uploads",
  SEED_FAST: "1",
  INSECURE_COOKIES: "1",
  PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING: "1",
};
const seed = "npx tsx scripts/reset-db.ts && npx tsx scripts/migrate.ts && npx tsx prisma/seed.ts";

export default defineConfig({
  testDir: "tests",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "tests/report" }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: process.env.PW_CHANNEL ?? "chrome",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  // "visual" is listed first: it only reads, and it needs the freshly seeded content that the
  // e2e suite later changes (new articles, services and pages).
  projects: [
    { name: "visual", testMatch: /visual\/.*\.spec\.ts/, use: { ...devices["Desktop Chrome"] } },
    { name: "e2e", testMatch: /e2e\/.*\.spec\.ts/, use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: `${seed} && ${process.env.E2E_SKIP_BUILD ? "" : "npx next build && "}npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    timeout: 600_000,
    reuseExistingServer: !process.env.CI,
    env,
    stdout: "pipe",
  },
});
