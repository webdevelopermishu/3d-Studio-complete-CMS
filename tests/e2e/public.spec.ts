import { test, expect } from "@playwright/test";
import { quietSite, sql } from "./helpers";

test.beforeEach(async ({ page }) => quietSite(page));

const ROUTES = [
  ["/", /Ideas that leave a mark/],
  ["/work", /Work/],
  ["/case-studies", /Case studies/],
  ["/case-studies/maison-verlaine", /Maison Verlaine/],
  ["/expertise", /Four disciplines/],
  ["/expertise/product-3d", /Product & 3D/],
  ["/studio", /Nothing here is accidental/],
  ["/newsroom", /A closer look/],
  ["/newsroom/pre-sale-renders-what-buyers-need", /Pre-sale renders/],
  ["/contact", /Your project/],
  ["/legal", /Legal notice/],
  ["/privacy", /Privacy policy/],
  ["/visual-signature", /Visual signature/],
] as const;

test.describe("routes", () => {
  for (const [path, h1] of ROUTES) {
    test(`${path} loads with one H1, title, canonical and no console errors`, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(String(e)));
      page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator("h1")).toHaveAccessibleName(h1);
      expect(await page.title()).not.toBe("");
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", path === "/" ? /^https?:\/\/[^/]+\/?$/ : new RegExp(`${path}$`));
      expect(errors).toEqual([]);
    });
  }

  test("unknown URLs return a styled 404", async ({ page }) => {
    const res = await page.goto("/this-does-not-exist");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("different angle");
    await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute("content", /noindex/);
  });

  test("legacy URLs redirect permanently", async ({ request }) => {
    const res = await request.get("/services/architecture", { maxRedirects: 0 });
    expect(res.status()).toBe(308);
    expect(res.headers().location).toContain("/expertise/architecture-real-estate");
  });
});

test.describe("navigation", () => {
  test("menu opens, traps focus, closes on Escape and navigates", async ({ page }) => {
    await page.goto("/");
    const toggle = page.getByRole("button", { name: "Open menu" });
    await toggle.click();
    const dialog = page.getByRole("dialog", { name: "Site menu" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("link", { name: /Work/ })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(toggle).toBeFocused();
    await toggle.click();
    await dialog.getByRole("link", { name: /Studio/ }).click();
    await expect(page).toHaveURL(/\/studio$/);
    await expect(page.locator("h1")).toHaveAccessibleName(/Nothing here/);
  });

  test("skip link moves focus to the content", async ({ page }) => {
    await page.goto("/work");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeFocused();
    await skip.press("Enter");
    await expect(page.locator("#content")).toBeFocused();
  });

  test("footer links and back-to-top work", async ({ page }) => {
    await page.goto("/expertise");
    const footer = page.locator("footer");
    await expect(footer.getByRole("link", { name: "Product & 3D" })).toHaveAttribute("href", "/expertise/product-3d");
    const top = footer.getByRole("button", { name: "Back to top" });
    await top.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1200); // let smooth scrolling settle
    await top.click();
    await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 5000 }).toBeLessThan(50);
  });
});

test.describe("portfolio", () => {
  test("work filters narrow the wall and sync to the URL", async ({ page }) => {
    await page.goto("/work");
    const tiles = page.locator(".work-tile");
    const all = await tiles.count();
    expect(all).toBeGreaterThan(10);
    await page.getByRole("group", { name: "Filter by Service" }).getByRole("button", { name: "Graphic Design" }).click();
    await expect(page).toHaveURL(/service=graphic-design/);
    const filtered = await tiles.count();
    expect(filtered).toBeGreaterThan(0);
    expect(filtered).toBeLessThan(all);
    await page.getByRole("group", { name: "Filter by Service" }).getByRole("button", { name: "All" }).click();
    await expect(tiles).toHaveCount(all);
    // Deep link restores the filter
    await page.goto("/work?industry=real-estate");
    await expect(page.getByRole("group", { name: "Filter by Industry" }).getByRole("button", { name: "Real Estate" })).toHaveAttribute("aria-pressed", "true");
  });

  test("lightbox opens, steps and closes with the keyboard", async ({ page }) => {
    await page.goto("/work");
    await page.locator(".work-tile").first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.locator(".lightbox__count")).toContainText("01 /");
    await page.keyboard.press("ArrowRight");
    await expect(dialog.locator(".lightbox__count")).toContainText("02 /");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("case study index filters by discipline and links to case studies", async ({ page }) => {
    await page.goto("/case-studies");
    const rows = page.locator(".cases__row");
    const total = await rows.count();
    expect(total).toBe(7);
    await page.getByRole("button", { name: /Product & 3D/ }).click();
    await expect.poll(() => rows.count()).toBeLessThan(total);
    await rows.first().getByRole("link").click();
    await expect(page).toHaveURL(/\/case-studies\/.+/);
    await expect(page.locator(".case-facts")).toContainText("Client");
  });

  test("service page lists offerings, related work and JSON-LD", async ({ page }) => {
    await page.goto("/expertise/product-3d");
    await page.locator(".caps").scrollIntoViewIfNeeded();
    await expect(page.locator(".caps__item").first()).toBeVisible();
    await expect(page.locator(".caps__item")).toContainText(["White-background packshots"]);
    await expect(page.getByRole("heading", { name: "Keep exploring" })).toBeVisible();
    const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(ld.join(" ")).toContain('"@type":"Service"');
    expect(ld.join(" ")).toContain('"@type":"BreadcrumbList"');
  });

  test("images load and have alt text or are decorative", async ({ page }) => {
    await page.goto("/expertise/architecture-real-estate");
    await page.mouse.wheel(0, 3000);
    await page.waitForTimeout(1500);
    const imgs = await page.locator("main img").evaluateAll((els) =>
      (els as HTMLImageElement[]).filter((i) => i.complete && i.getBoundingClientRect().width > 0).map((i) => ({ ok: i.naturalWidth > 0, alt: i.getAttribute("alt") })),
    );
    expect(imgs.length).toBeGreaterThan(2);
    expect(imgs.every((i) => i.ok)).toBe(true);
    expect(imgs.every((i) => i.alt !== null)).toBe(true);
  });
});

test.describe("contact brief", () => {
  test("completes all five steps, validates, and stores the submission", async ({ page }) => {
    const email = `e2e-${Date.now()}@example.com`;
    await page.goto("/contact");
    const form = page.locator("#brief");
    await expect(form.getByText("Step 1 of 5")).toBeVisible();
    // Validation: can't continue without a discipline
    await form.getByRole("button", { name: "Next" }).click();
    await expect(form.getByRole("alert")).toContainText("at least one discipline");
    await form.getByText("Product & 3D", { exact: true }).click();
    await form.getByRole("button", { name: "Next" }).click();
    await expect(form.getByText("Step 2 of 5")).toBeVisible();
    await form.getByText("Lifestyle scenes").click();
    await form.getByRole("button", { name: "Next" }).click();
    await form.getByLabel("Describe the project").fill("Twelve lifestyle renders for an outdoor furniture launch next spring.");
    await form.getByRole("button", { name: "Next" }).click();
    await expect(form.getByText("Step 4 of 5")).toBeVisible();
    await form.getByText("$5,000 to $10,000").click();
    await form.getByText("Within a month").click();
    await form.getByRole("button", { name: "Next" }).click();
    await form.getByLabel("Name", { exact: true }).fill("E2E Tester");
    await form.locator("#brief-email").fill(email);
    // Back keeps answers
    await form.getByRole("button", { name: /Back/ }).click();
    await expect(form.getByLabel("$5,000 to $10,000")).toBeChecked();
    await form.getByRole("button", { name: "Next" }).click();
    await expect(form.locator("#brief-email")).toHaveValue(email);
    await form.getByRole("button", { name: "Send brief" }).click();
    await expect(page.getByRole("heading", { name: "Brief received." })).toBeVisible();
    const rows = await sql<{ name: string; disciplines: string[]; budget: string }>(`SELECT name, disciplines, budget FROM "ContactSubmission" WHERE email = $1`, [email]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ name: "E2E Tester", disciplines: ["Product & 3D"], budget: "$5,000 to $10,000" });
  });
});

test.describe("SEO surface", () => {
  test("sitemap lists published content and robots blocks admin", async ({ request }) => {
    const sm = await (await request.get("/sitemap.xml")).text();
    expect(sm).toContain("/case-studies/maison-verlaine");
    expect(sm).toContain("/newsroom/");
    expect(sm).not.toContain("/admin");
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /admin");
    expect(robots).toContain("Sitemap:");
  });

  test("pages expose Open Graph, Twitter and Organization data", async ({ page }) => {
    await page.goto("/case-studies/maison-verlaine");
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", /Maison Verlaine/);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /\/media\//);
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
    const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).join(" ");
    expect(ld).toContain('"@type":"Organization"');
    expect(ld).toContain('"@type":"CreativeWork"');
  });
});

test.describe("motion & responsive", () => {
  test("animations run on desktop: hero words rise and scenes pin", async ({ page }) => {
    await page.goto("/");
    await expect.poll(() => page.locator(".hero__title [data-word]").first().evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m42), { timeout: 8000 }).toBeLessThan(1);
    await expect(page.locator(".pin-spacer").first()).toBeAttached();
    await expect(page.locator("html")).toHaveClass(/motion-ready/);
  });

  test("reduced motion shows all content with no pinning", async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await quietSite(page);
    await page.goto("/");
    await expect(page.locator("html")).not.toHaveClass(/js-motion/);
    const t = await page.locator(".statement__title [data-word]").first().evaluate((el) => getComputedStyle(el).transform);
    expect(t === "none" || new DOMMatrix(t).m42 === 0).toBe(true);
    await expect(page.locator(".pin-spacer")).toHaveCount(0);
    await ctx.close();
  });

  for (const vp of [{ width: 390, height: 844 }, { width: 768, height: 1024 }]) {
    test(`no horizontal overflow and working menu at ${vp.width}px`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: vp, hasTouch: true, isMobile: vp.width < 600 });
      const page = await ctx.newPage();
      await quietSite(page);
      for (const path of ["/", "/work", "/expertise/product-3d", "/contact", "/case-studies/maison-verlaine"]) {
        await page.goto(path);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, `${path} overflows horizontally`).toBeLessThanOrEqual(1);
      }
      await page.getByRole("button", { name: "Open menu" }).click();
      await expect(page.getByRole("dialog", { name: "Site menu" }).getByRole("link", { name: /Work/ })).toBeVisible();
      await ctx.close();
    });
  }
});
