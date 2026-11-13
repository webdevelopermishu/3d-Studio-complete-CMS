import { test, expect, type Page } from "@playwright/test";
import { login, quietSite, sql, uid, ADMIN } from "./helpers";

test.describe("authentication", () => {
  test("protected routes redirect to login", async ({ page }) => {
    await page.goto("/admin/pages");
    await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Fpages/);
  });

  test("wrong password is rejected; correct password signs in and out", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(ADMIN.email);
    await page.getByLabel("Password").fill("not-the-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Email or password is incorrect.")).toBeVisible();
    await login(page);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Hello");
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/admin\/login/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("server actions refuse unauthenticated calls", async ({ request }) => {
    const res = await request.post("/api/admin/media", { multipart: { file: { name: "x.png", mimeType: "image/png", buffer: Buffer.from("x") } } });
    expect(res.status()).toBe(401);
    const csv = await request.get("/api/admin/submissions/export");
    expect(csv.status()).toBe(403);
  });
});

test.describe("role-based access", () => {
  test("a viewer can read but not manage settings or publish", async ({ page }) => {
    const email = `viewer-${uid()}@example.com`;
    await login(page);
    await page.goto("/admin/users");
    await page.getByRole("button", { name: "Invite user" }).click();
    await page.getByLabel("Name", { exact: true }).fill("Vera Viewer");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Role", { exact: true }).selectOption({ label: "Viewer" });
    await page.getByLabel("Initial password").fill("viewer-pass-123");
    await page.getByRole("button", { name: "Save user" }).click();
    await expect(page.getByRole("cell", { name: email })).toBeVisible();
    await page.getByRole("button", { name: "Sign out" }).click();

    await login(page, email, "viewer-pass-123");
    await expect(page.getByRole("navigation", { name: "Admin" }).getByRole("link", { name: "Settings" })).toHaveCount(0);
    await page.goto("/admin/settings");
    await expect(page).toHaveURL(/forbidden=settings.write/);
    await page.goto("/admin/pages");
    await page.getByRole("link", { name: "Studio" }).click();
    await expect(page.getByRole("button", { name: /Publish/ })).toHaveCount(0);
  });
});

async function newPage(page: Page, title: string, slug: string) {
  await page.goto("/admin/pages");
  await page.getByRole("button", { name: "New page" }).click();
  await page.getByLabel("Title", { exact: true }).fill(title);
  await page.getByLabel("URL path").fill(slug);
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page).toHaveURL(/\/admin\/pages\/[a-z0-9]+$/);
}

async function addRichText(page: Page, heading: string) {
  await page.getByRole("button", { name: "Add section" }).last().click();
  const dialog = page.getByRole("dialog", { name: "Add section" });
  await dialog.getByPlaceholder("Search sections").fill("rich text");
  await dialog.getByRole("button", { name: /Rich text/ }).click();
  const panel = page.getByRole("dialog", { name: /Edit Rich text/ });
  await panel.getByLabel("Heading", { exact: true }).fill(heading);
  await panel.getByRole("button", { name: "Save section" }).click();
  await expect(panel).toBeHidden();
}

test.describe("pages & section builder", () => {
  test.beforeEach(async ({ page }) => login(page));

  test("create → add sections → reorder → publish → visible; unpublish → 404; delete", async ({ page, context }) => {
    const slug = `e2e-${uid()}`;
    await newPage(page, "E2E Page", slug);
    await addRichText(page, "First block");
    await addRichText(page, "Second block");
    const rows = page.locator('ol[aria-label="Sections"] > li');
    await expect(rows).toHaveCount(2);

    // Keyboard reorder: move "Second" above "First"
    // dnd-kit measures positions asynchronously after pick-up and ignores keys pressed before
    // that, so wait for its live-region announcements between keys.
    const live = page.locator('[id^="DndLiveRegion"]');
    await expect(async () => {
      await page.getByRole("button", { name: "Reorder section 2" }).focus();
      await page.keyboard.press("Space");
      await expect(live).toHaveText(/Picked up|was moved over/, { timeout: 1500 });
    }).toPass({ timeout: 15_000 });
    const pickedUp = (await live.textContent()) ?? "";
    await page.keyboard.press("ArrowUp");
    await expect(live).not.toHaveText(pickedUp);
    await page.keyboard.press("Space");
    await expect(rows.first()).toContainText("Second block");
    await page.reload();
    await expect(rows.first()).toContainText("Second block");

    // Draft only: public 404 until published
    expect((await page.request.get(`/${slug}`)).status()).toBe(404);
    await page.getByRole("button", { name: "Publish", exact: true }).click();
    await expect(page.getByText("Published", { exact: true }).first()).toBeVisible();
    const pub = await context.newPage();
    await quietSite(pub);
    await pub.goto(`/${slug}`);
    const headings = pub.locator(".rich__heading");
    await expect(headings).toHaveText(["Second block", "First block"]);

    // Hide + duplicate + delete
    await rows.nth(1).getByRole("button", { name: "Hide section" }).click();
    await rows.first().getByRole("button", { name: "Duplicate section" }).click();
    await expect(rows).toHaveCount(3);
    await rows.nth(1).getByRole("button", { name: "Delete section" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
    await expect(rows).toHaveCount(2);
    await expect(page.getByText("Unpublished changes")).toBeVisible();
    await page.getByRole("button", { name: "Publish changes" }).click();
    await expect(page.getByText("Unpublished changes")).toHaveCount(0);
    await expect(async () => {
      await pub.reload();
      await expect(pub.locator(".rich__heading")).toHaveText(["Second block"], { timeout: 1000 });
    }).toPass({ timeout: 15_000 });

    // Unpublish → 404, then delete
    await page.getByRole("button", { name: "Unpublish" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Unpublish" }).click();
    await expect.poll(async () => (await page.request.get(`/${slug}`)).status()).toBe(404);
    await page.locator("button:has(svg.lucide-trash-2)").first().click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
    await expect(page).toHaveURL(/\/admin\/pages$/);
    await expect(page.getByRole("link", { name: "E2E Page" })).toHaveCount(0);
  });

  test("slugs are unique and reserved paths are refused", async ({ page }) => {
    await page.goto("/admin/pages");
    await page.getByRole("button", { name: "New page" }).click();
    await page.getByLabel("Title", { exact: true }).fill("Dup");
    await page.getByLabel("URL path").fill("studio");
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page.getByText(/already in use/).first()).toBeVisible();
    await page.getByLabel("URL path").fill("admin");
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page.getByText(/reserved/).first()).toBeVisible();
  });

  test("draft preview shows unpublished changes only to signed-in editors", async ({ page, browser }) => {
    const slug = `preview-${uid()}`;
    await newPage(page, "Preview Page", slug);
    await addRichText(page, "Published copy");
    await page.getByRole("button", { name: "Publish", exact: true }).click();
    await expect(page.getByText("Published", { exact: true }).first()).toBeVisible();
    await page.locator('ol[aria-label="Sections"] > li').first().getByRole("button", { name: "Edit section" }).click();
    const panel = page.getByRole("dialog", { name: /Edit Rich text/ });
    await panel.getByLabel("Heading", { exact: true }).fill("Draft copy");
    await panel.getByRole("button", { name: "Save section" }).click();
    await expect(panel).toBeHidden();

    const [preview] = await Promise.all([page.waitForEvent("popup"), page.getByRole("button", { name: "Preview draft" }).click()]);
    await preview.waitForURL(new RegExp(`/${slug}$`));
    await expect(preview.locator(".rich__heading")).toHaveText("Draft copy");
    await expect(preview.getByRole("status").filter({ hasText: "Preview mode" })).toBeVisible();
    await expect(preview.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);

    // Anonymous visitors still see the published version, and the preview link alone isn't enough
    const anon = await browser.newContext();
    const ap = await anon.newPage();
    await quietSite(ap);
    await ap.goto(`/${slug}`);
    await expect(ap.locator(".rich__heading")).toHaveText("Published copy");
    await ap.goto(preview.url().replace(/\/[^/]*$/, "/api/preview?token=forged.token"));
    expect(await ap.content()).toContain("Invalid or expired");
    await anon.close();
  });
});

test.describe("projects, services, articles", () => {
  test.beforeEach(async ({ page }) => login(page));

  test("project CRUD with taxonomies and a case-study page", async ({ page }) => {
    const title = `E2E Project ${uid()}`;
    await page.goto("/admin/projects/new");
    await page.getByLabel("Title", { exact: true }).fill(title);
    await page.getByLabel("Client").fill("Acme Test");
    await page.getByRole("switch", { name: "Has a case-study page" }).click();
    await page.getByLabel("Discipline (service)").selectOption({ label: "Product & 3D" });
    await page.getByRole("button", { name: "Product", exact: true }).click();
    await page.getByLabel("Card summary").fill("Created by the end-to-end suite.");
    await page.getByRole("button", { name: "Create project" }).click();
    await expect(page).toHaveURL(/\/admin\/projects\/(?!new)[a-z0-9]+$/);
    const slug = await page.getByLabel("Slug").inputValue();
    await page.getByRole("button", { name: "Publish", exact: true }).click();
    await expect(page.getByText("Published", { exact: true }).first()).toBeVisible();
    const res = await page.request.get(`/case-studies/${slug}`);
    expect(res.status()).toBe(200);
    expect(await res.text()).toContain("Acme Test");
    const rows = await sql<{ n: string }>(`SELECT count(*)::text AS n FROM "_ProjectToProjectCategory" pc JOIN "Project" p ON p.id = pc."A" WHERE p.slug = $1`, [slug]);
    expect(rows[0].n).toBe("1");
    // Edit persists
    await page.getByLabel("Client").fill("Acme Renamed");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect.poll(async () => (await (await page.request.get(`/case-studies/${slug}`)).text()).includes("Acme Renamed")).toBe(true);
    // Delete frees the slug
    await page.locator("button:has(svg.lucide-trash-2)").first().click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
    await expect(page).toHaveURL(/\/admin\/projects$/);
    expect((await page.request.get(`/case-studies/${slug}`)).status()).toBe(404);
  });

  test("service CRUD feeds the contact brief options", async ({ page }) => {
    const title = `E2E Service ${uid()}`;
    await page.goto("/admin/services/new");
    await page.getByLabel("Title", { exact: true }).fill(title);
    await page.getByLabel("Summary").fill("A service created during end-to-end testing.");
    await page.getByRole("button", { name: "Create service" }).click();
    await expect(page).toHaveURL(/\/admin\/services\/(?!new)[a-z0-9]+$/);
    await page.getByPlaceholder("e.g. Exterior renderings").fill("Test offering");
    await page.getByPlaceholder("e.g. Exterior renderings").press("Enter");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.getByRole("button", { name: "Publish", exact: true }).click();
    await expect(page.getByText("Published", { exact: true }).first()).toBeVisible();
    const contact = await (await page.request.get("/contact")).text();
    expect(contact).toContain(title);
  });

  test("article with rich text body is published to the newsroom", async ({ page }) => {
    const title = `E2E Article ${uid()}`;
    await page.goto("/admin/articles/new");
    await page.getByLabel("Title", { exact: true }).fill(title);
    await page.getByLabel("Excerpt").fill("An article from the test suite.");
    const editor = page.getByRole("textbox", { name: "Article body" });
    await editor.click();
    await page.keyboard.type("Body paragraph written in the rich text editor.");
    await page.getByRole("button", { name: "Create article" }).click();
    await expect(page).toHaveURL(/\/admin\/articles\/(?!new)[a-z0-9]+$/);
    await page.getByRole("button", { name: "Publish", exact: true }).click();
    await expect(page.getByText("Published", { exact: true }).first()).toBeVisible();
    const slug = await page.getByLabel("Slug").inputValue();
    const html = await (await page.request.get(`/newsroom/${slug}`)).text();
    expect(html).toContain("Body paragraph written in the rich text editor.");
    expect(await (await page.request.get("/newsroom")).text()).toContain(title);
  });
});

test.describe("media, SEO, settings, submissions", () => {
  test.beforeEach(async ({ page }) => login(page));

  test("upload an image, add alt text, see it served, then delete it", async ({ page }) => {
    await page.goto("/admin/media");
    // 1×1 PNG
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
    await page.locator('input[type="file"]').first().setInputFiles({ name: `e2e-${uid()}.png`, mimeType: "image/png", buffer: png });
    await expect(page.getByRole("status").filter({ hasText: /Uploaded 1 file/ })).toBeVisible();
    const details = page.getByRole("complementary", { name: "File details" });
    await details.getByLabel("Alt text").fill("A single test pixel");
    await details.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Details saved" })).toBeVisible();
    const src = await details.locator("img").getAttribute("src");
    const fileRes = await page.request.get(src!);
    expect(fileRes.status()).toBe(200);
    expect(fileRes.headers()["content-type"]).toMatch(/image\//);
    const [{ alt }] = await sql<{ alt: string }>(`SELECT alt FROM "Media" ORDER BY "createdAt" DESC LIMIT 1`);
    expect(alt).toBe("A single test pixel");
    await details.locator("button:has(svg.lucide-trash-2)").click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
    await expect(details).toBeHidden();
  });

  test("rejects files whose content doesn't match their type", async ({ page }) => {
    const res = await page.request.post("/api/admin/media", { multipart: { file: { name: "evil.png", mimeType: "image/png", buffer: Buffer.from("<script>alert(1)</script>") } } });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toMatch(/doesn't match/);
  });

  test("SEO title changes persist to the public page", async ({ page }) => {
    await page.goto("/admin/pages");
    await page.getByRole("link", { name: "Studio" }).click();
    const t = `Studio SEO ${uid()} | Halden`;
    await page.getByLabel(/SEO title/).fill(t);
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "Page saved" })).toBeVisible();
    await expect.poll(async () => (await (await page.request.get("/studio")).text()).includes(`<title>${t}</title>`)).toBe(true);
  });

  test("redirect manager creates working redirects", async ({ page }) => {
    const from = `/old-${uid()}`;
    await page.goto("/admin/seo");
    await page.getByLabel("From", { exact: true }).fill(from);
    await page.getByLabel("To", { exact: true }).fill("/work");
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByText(`${from} → /work`)).toBeVisible();
    await expect.poll(async () => (await page.request.get(from, { maxRedirects: 0 })).status(), { timeout: 40_000, intervals: [2000] }).toBe(308);
  });

  test("global settings persist (site name in header)", async ({ page }) => {
    await page.goto("/admin/settings");
    const name = `Halden ${uid()}`;
    await page.getByLabel("Site name").fill(name);
    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Settings saved" })).toBeVisible();
    await expect.poll(async () => (await (await page.request.get("/studio")).text()).includes(name)).toBe(true);
    await page.getByLabel("Site name").fill("Halden");
    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Settings saved" })).toBeVisible();
  });

  test("navigation edits persist", async ({ page }) => {
    await page.goto("/admin/navigation");
    const card = page.locator("section").filter({ hasText: "Footer — sitemap" });
    await card.getByRole("button", { name: "Add link" }).click();
    await card.getByLabel("Label", { exact: true }).last().fill("E2E Link");
    await card.getByLabel("Link", { exact: true }).last().fill("/newsroom");
    await card.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("status").filter({ hasText: "saved" })).toBeVisible();
    await expect.poll(async () => (await (await page.request.get("/work")).text()).includes("E2E Link")).toBe(true);
  });

  test("submissions inbox lists stored briefs and exports CSV", async ({ page }) => {
    await page.goto("/admin/submissions?status=ALL");
    await expect(page.getByText("Jordan Example").first()).toBeVisible();
    await page.getByText("Jordan Example").first().click();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText("Twelve-unit residential scheme")).toBeVisible();
    const csv = await page.request.get("/api/admin/submissions/export?status=ALL");
    expect(csv.status()).toBe(200);
    expect(await csv.text()).toContain("jordan@example.com");
  });

  test("SEO dashboard renders checks for every content type", async ({ page }) => {
    await page.goto("/admin/seo");
    for (const kind of ["Page", "Service", "Case study", "Article"]) await expect(page.getByText(new RegExp(`^${kind} ·`)).first()).toBeVisible();
  });
});
