import { expect, type Page } from "@playwright/test";
import { Client } from "pg";

export const ADMIN = { email: "admin@example.com", password: "ChangeMe!2026" };

/** Skip the intro loader + cookie banner so tests start on the content. */
export async function quietSite(page: Page) {
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem("loader-seen", "1");
      localStorage.setItem("cookie-consent-v1", JSON.stringify({ necessary: true, analytics: false, at: "e2e" }));
    } catch {}
  });
}

export async function login(page: Page, email = ADMIN.email, password = ADMIN.password) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

export async function sql<T = Record<string, unknown>>(query: string, params: unknown[] = []): Promise<T[]> {
  const c = new Client({ connectionString: process.env.E2E_DATABASE_URL ?? process.env.TEST_DATABASE_URL });
  await c.connect();
  try {
    return (await c.query(query, params)).rows as T[];
  } finally {
    await c.end();
  }
}

export async function expectToast(page: Page, text: string | RegExp) {
  await expect(page.getByRole("status").filter({ hasText: text }).first()).toBeVisible();
}

export const uid = () => Math.random().toString(36).slice(2, 8);
