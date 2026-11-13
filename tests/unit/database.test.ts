/**
 * Database integration tests against TEST_DATABASE_URL (a disposable database).
 * Verifies migrations, constraints, relations, cascades and the revision/slug rules the CMS relies on.
 */
import { execFileSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const url = process.env.TEST_DATABASE_URL;
const run = url ? describe : describe.skip;
let db: PrismaClient;

run("database", () => {
  beforeAll(() => {
    const env: NodeJS.ProcessEnv = { ...process.env, DATABASE_URL: url!, NODE_ENV: "test" };
    execFileSync("npx", ["tsx", "scripts/reset-db.ts"], { env, stdio: "pipe" });
    const out = execFileSync("npx", ["tsx", "scripts/migrate.ts"], { env, encoding: "utf8" });
    expect(out).toMatch(/applied \d+ migration/);
    db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url! }) });
  }, 120_000);
  afterAll(async () => db?.$disconnect());

  it("migrations are idempotent", () => {
    const out = execFileSync("npx", ["tsx", "scripts/migrate.ts"], { env: { ...process.env, DATABASE_URL: url! }, encoding: "utf8" });
    expect(out).toContain("up to date");
  });

  it("enforces unique slugs per content type", async () => {
    await db.page.create({ data: { title: "A", slug: "about" } });
    await expect(db.page.create({ data: { title: "B", slug: "about" } })).rejects.toMatchObject({ code: "P2002" });
    await db.project.create({ data: { title: "P", slug: "about" } }); // different table → allowed
    await expect(db.project.create({ data: { title: "P2", slug: "about" } })).rejects.toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
  });

  it("persists sections in order and cascades on page delete", async () => {
    const page = await db.page.create({ data: { title: "Cascade", slug: "cascade" } });
    await db.pageSection.createMany({ data: [0, 1, 2].map((order) => ({ pageId: page.id, type: "richText", order, data: { heading: `S${order}` } })) });
    const rows = await db.pageSection.findMany({ where: { pageId: page.id }, orderBy: { order: "asc" } });
    expect(rows.map((r) => (r.data as { heading: string }).heading)).toEqual(["S0", "S1", "S2"]);
    await db.page.delete({ where: { id: page.id } });
    expect(await db.pageSection.count({ where: { pageId: page.id } })).toBe(0);
  });

  it("links projects to taxonomies (many-to-many) and services", async () => {
    const svc = await db.service.create({ data: { title: "Product", slug: "product", offerings: ["Packshots"] } });
    const cat = await db.projectCategory.create({ data: { name: "Product", slug: "product" } });
    const ind = await db.industry.create({ data: { name: "Retail", slug: "retail" } });
    const p = await db.project.create({
      data: { title: "Chair", slug: "chair", serviceId: svc.id, categories: { connect: [{ id: cat.id }] }, industries: { connect: [{ id: ind.id }] } },
      include: { categories: true, industries: true, service: true },
    });
    expect(p.categories[0].slug).toBe("product");
    expect(p.service?.offerings).toEqual(["Packshots"]);
    // Deleting a service keeps the project but clears the link
    await db.service.delete({ where: { id: svc.id } });
    expect((await db.project.findUnique({ where: { id: p.id } }))?.serviceId).toBeNull();
  });

  it("attaches one SEO row per entity", async () => {
    const seo = await db.sEOSettings.create({ data: { title: "T", description: "D" } });
    await db.page.create({ data: { title: "SEO", slug: "seo-test", seoId: seo.id } });
    await expect(db.page.create({ data: { title: "SEO2", slug: "seo-test-2", seoId: seo.id } })).rejects.toMatchObject({ code: "P2002" });
  });

  it("cascades sessions and keeps content when users are deleted", async () => {
    const role = await db.role.create({ data: { key: "T", name: "T" } });
    const u = await db.user.create({ data: { email: "t@example.com", name: "T", passwordHash: "x", roleId: role.id } });
    await db.session.create({ data: { userId: u.id, tokenHash: "h1", expiresAt: new Date(Date.now() + 1e6) } });
    const a = await db.article.create({ data: { title: "Post", slug: "post", authorId: u.id } });
    await db.user.delete({ where: { id: u.id } });
    expect(await db.session.count({ where: { userId: u.id } })).toBe(0);
    expect((await db.article.findUnique({ where: { id: a.id } }))?.authorId).toBeNull();
  });

  it("stores contact submissions with array fields", async () => {
    const s = await db.contactSubmission.create({ data: { name: "N", email: "n@example.com", description: "Test", disciplines: ["A", "B"], services: [] } });
    expect(s.status).toBe("NEW");
    expect(s.disciplines).toEqual(["A", "B"]);
  });

  it("keeps redirect sources unique", async () => {
    await db.redirect.create({ data: { source: "/old", destination: "/new" } });
    await expect(db.redirect.create({ data: { source: "/old", destination: "/x" } })).rejects.toMatchObject({ code: "P2002" });
  });
});
