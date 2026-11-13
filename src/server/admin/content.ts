"use server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { signPreviewToken } from "@/lib/preview";
import type { PermissionKey } from "@/lib/auth/permissions";
import {
  guarded, idSchema, slugSchema, pagePathSchema, optStr, seoSchema, upsertSeo, saveRevision, revalidateSite, audit,
  tombstone, UserError, RESERVED_PATHS,
} from "./guard";

type Kind = "page" | "project" | "service" | "article";
const P = (k: Kind, a: "write" | "publish" | "delete" | "read") => `${k}.${a}` as PermissionKey;
const kindSchema = z.enum(["page", "project", "service", "article"]);

const sectionSnapshot = (rows: { id: string; type: string; enabled: boolean; data: Prisma.JsonValue; label: string | null }[]) =>
  rows.map((s) => ({ id: s.id, type: s.type, enabled: s.enabled, data: s.data, label: s.label }));

// ───────────────────────── Pages ─────────────────────────
const pageSchema = z.object({
  id: idSchema.optional(),
  title: z.string().trim().min(1, "Title is required.").max(200),
  slug: pagePathSchema,
  seo: seoSchema.optional(),
});

export async function savePage(input: unknown) {
  return guarded("page.write", pageSchema, input, async (d, user) => {
    if (RESERVED_PATHS.includes(d.slug.split("/")[0]) && !(await isSystemSlug(d.id, d.slug))) throw new UserError("That path is reserved by the site.", "slug");
    const row = await db.$transaction(async (tx) => {
      if (d.id) {
        const cur = await tx.page.findUniqueOrThrow({ where: { id: d.id } });
        if (cur.system && cur.slug !== d.slug) throw new UserError("System pages keep their URL.", "slug");
        const seoId = await upsertSeo(tx, cur.seoId, d.seo);
        return tx.page.update({ where: { id: d.id }, data: { title: d.title, slug: d.slug, seoId } });
      }
      const seoId = await upsertSeo(tx, null, d.seo ?? seoSchema.parse({}));
      return tx.page.create({ data: { title: d.title, slug: d.slug, seoId, status: "DRAFT" } });
    });
    await audit(user, d.id ? "page.update" : "page.create", "page", row.id);
    revalidateSite();
    return { id: row.id };
  });
}
async function isSystemSlug(id: string | undefined, slug: string) {
  if (!id) return false;
  const p = await db.page.findUnique({ where: { id }, select: { system: true, slug: true } });
  return !!p?.system && p.slug === slug;
}

export async function duplicatePage(input: unknown) {
  return guarded("page.write", z.object({ id: idSchema }), input, async ({ id }, user) => {
    const src = await db.page.findUniqueOrThrow({ where: { id }, include: { sections: true, seo: true } });
    let slug = `${src.slug || "home"}-copy`;
    for (let n = 2; await db.page.findUnique({ where: { slug } }); n++) slug = `${src.slug || "home"}-copy-${n}`;
    const row = await db.$transaction(async (tx) => {
      const { id: _i, updatedAt: _u, page: _p, project: _pr, service: _s, article: _a, ...seoData } = (src.seo ?? {}) as Record<string, unknown>;
      void _i; void _u; void _p; void _pr; void _s; void _a;
      const seo = src.seo ? await tx.sEOSettings.create({ data: seoData as Prisma.SEOSettingsCreateInput }) : null;
      const page = await tx.page.create({ data: { title: `${src.title} (copy)`, slug, status: "DRAFT", seoId: seo?.id } });
      await tx.pageSection.createMany({
        data: src.sections.map((s) => ({ type: s.type, data: s.data as Prisma.InputJsonValue, order: s.order, enabled: s.enabled, label: s.label, pageId: page.id })),
      });
      return page;
    });
    await audit(user, "page.duplicate", "page", row.id, { from: id });
    return { id: row.id };
  });
}

// ───────────────────────── Projects ─────────────────────────
const projectSchema = z.object({
  id: idSchema.optional(),
  title: z.string().trim().min(1, "Title is required.").max(200),
  slug: slugSchema,
  client: optStr(160),
  year: z.number().int().min(1900).max(2100).nullish(),
  location: optStr(160),
  summary: optStr(400),
  lead: optStr(1200),
  servicesText: optStr(400),
  isCaseStudy: z.boolean(),
  showOnWall: z.boolean(),
  featured: z.boolean(),
  wallAspect: z.enum(["4/5", "3/2", "1/1", "16/9"]),
  coverId: optStr(60),
  videoId: optStr(60),
  serviceId: optStr(60),
  order: z.number().int().min(0).max(100000).default(0),
  categoryIds: z.array(idSchema).max(50).default([]),
  deliverableIds: z.array(idSchema).max(50).default([]),
  industryIds: z.array(idSchema).max(50).default([]),
  seo: seoSchema.optional(),
});

export async function saveProject(input: unknown) {
  return guarded("project.write", projectSchema, input, async (d, user) => {
    const { id, seo, categoryIds, deliverableIds, industryIds, ...fields } = d;
    const rels = {
      categories: { set: categoryIds.map((x) => ({ id: x })) },
      deliverables: { set: deliverableIds.map((x) => ({ id: x })) },
      industries: { set: industryIds.map((x) => ({ id: x })) },
    };
    const row = await db.$transaction(async (tx) => {
      if (id) {
        const cur = await tx.project.findUniqueOrThrow({ where: { id } });
        const seoId = await upsertSeo(tx, cur.seoId, seo);
        return tx.project.update({ where: { id }, data: { ...fields, seoId, ...rels } });
      }
      const seoId = await upsertSeo(tx, null, seo ?? seoSchema.parse({}));
      return tx.project.create({
        data: {
          ...fields, seoId, status: "DRAFT",
          categories: { connect: categoryIds.map((x) => ({ id: x })) },
          deliverables: { connect: deliverableIds.map((x) => ({ id: x })) },
          industries: { connect: industryIds.map((x) => ({ id: x })) },
        },
      });
    });
    await audit(user, id ? "project.update" : "project.create", "project", row.id);
    revalidateSite();
    return { id: row.id };
  });
}

// ───────────────────────── Services ─────────────────────────
const serviceSchema = z.object({
  id: idSchema.optional(),
  title: z.string().trim().min(1, "Title is required.").max(200),
  slug: slugSchema,
  tagline: optStr(300),
  summary: optStr(600),
  offerings: z.array(z.string().trim().min(1).max(200)).max(60).default([]),
  coverId: optStr(60),
  order: z.number().int().min(0).max(10000).default(0),
  seo: seoSchema.optional(),
});

export async function saveService(input: unknown) {
  return guarded("service.write", serviceSchema, input, async (d, user) => {
    const { id, seo, ...fields } = d;
    const row = await db.$transaction(async (tx) => {
      if (id) {
        const cur = await tx.service.findUniqueOrThrow({ where: { id } });
        const seoId = await upsertSeo(tx, cur.seoId, seo);
        return tx.service.update({ where: { id }, data: { ...fields, seoId } });
      }
      const seoId = await upsertSeo(tx, null, seo ?? seoSchema.parse({}));
      return tx.service.create({ data: { ...fields, seoId, status: "DRAFT" } });
    });
    await audit(user, id ? "service.update" : "service.create", "service", row.id);
    revalidateSite();
    return { id: row.id };
  });
}

// ───────────────────────── Articles ─────────────────────────
const articleSchema = z.object({
  id: idSchema.optional(),
  title: z.string().trim().min(1, "Title is required.").max(240),
  slug: slugSchema,
  excerpt: optStr(600),
  body: z.object({ type: z.literal("doc"), content: z.array(z.unknown()).optional() }).nullable(),
  coverId: optStr(60),
  serviceIds: z.array(idSchema).max(20).default([]),
  publishedAt: z.string().datetime({ offset: true }).nullish(),
  seo: seoSchema.optional(),
});

export async function saveArticle(input: unknown) {
  return guarded("article.write", articleSchema, input, async (d, user) => {
    const { id, seo, serviceIds, publishedAt, body, ...fields } = d;
    const row = await db.$transaction(async (tx) => {
      const base = { ...fields, body: (body ?? undefined) as Prisma.InputJsonValue | undefined, publishedAt: publishedAt ? new Date(publishedAt) : undefined };
      if (id) {
        const cur = await tx.article.findUniqueOrThrow({ where: { id } });
        const seoId = await upsertSeo(tx, cur.seoId, seo);
        const row = await tx.article.update({ where: { id }, data: { ...base, seoId, services: { set: serviceIds.map((x) => ({ id: x })) } } });
        await saveRevision(tx, "article", id, row, user.id, "Saved");
        return row;
      }
      const seoId = await upsertSeo(tx, null, seo ?? seoSchema.parse({}));
      return tx.article.create({ data: { ...base, seoId, status: "DRAFT", authorId: user.id, services: { connect: serviceIds.map((x) => ({ id: x })) } } });
    });
    await audit(user, id ? "article.update" : "article.create", "article", row.id);
    revalidateSite();
    return { id: row.id };
  });
}

// ───────────────────────── Shared: publish / unpublish / delete / preview / revisions ─────────────────────────
const refSchema = z.object({ kind: kindSchema, id: idSchema });

async function snapshotOf(tx: Prisma.TransactionClient, kind: Kind, id: string) {
  if (kind === "page") return tx.page.findUniqueOrThrow({ where: { id }, include: { sections: { orderBy: { order: "asc" } }, seo: true } });
  if (kind === "project") return tx.project.findUniqueOrThrow({ where: { id }, include: { sections: { orderBy: { order: "asc" } }, seo: true, categories: true, deliverables: true, industries: true } });
  if (kind === "service") return tx.service.findUniqueOrThrow({ where: { id }, include: { sections: { orderBy: { order: "asc" } }, seo: true } });
  return tx.article.findUniqueOrThrow({ where: { id }, include: { seo: true, services: { select: { id: true } } } });
}

export async function publish(input: unknown) {
  const pre = refSchema.safeParse(input);
  return guarded(pre.success ? P(pre.data.kind, "publish") : "page.publish", refSchema, input, async ({ kind, id }, user) => {
    await db.$transaction(async (tx) => {
      const now = new Date();
      if (kind === "article") {
        const a = await tx.article.findUniqueOrThrow({ where: { id } });
        await tx.article.update({ where: { id }, data: { status: "PUBLISHED", publishedAt: a.publishedAt ?? now } });
      } else {
        const rows = await tx.pageSection.findMany({ where: kind === "page" ? { pageId: id } : kind === "project" ? { projectId: id } : { serviceId: id }, orderBy: { order: "asc" } });
        const data = { status: "PUBLISHED" as const, publishedAt: now, publishedSections: sectionSnapshot(rows) as Prisma.InputJsonValue };
        if (kind === "page") await tx.page.update({ where: { id }, data });
        else if (kind === "project") await tx.project.update({ where: { id }, data });
        else await tx.service.update({ where: { id }, data });
      }
      await saveRevision(tx, kind, id, await snapshotOf(tx, kind, id), user.id, "Published");
    });
    await audit(user, `${kind}.publish`, kind, id);
    revalidateSite();
  });
}

export async function unpublish(input: unknown) {
  const pre = refSchema.safeParse(input);
  return guarded(pre.success ? P(pre.data.kind, "publish") : "page.publish", refSchema, input, async ({ kind, id }, user) => {
    if (kind === "page") {
      const p = await db.page.findUniqueOrThrow({ where: { id } });
      if (p.slug === "") throw new UserError("The home page can't be unpublished.");
      await db.page.update({ where: { id }, data: { status: "DRAFT" } });
    } else if (kind === "project") await db.project.update({ where: { id }, data: { status: "DRAFT" } });
    else if (kind === "service") await db.service.update({ where: { id }, data: { status: "DRAFT" } });
    else await db.article.update({ where: { id }, data: { status: "DRAFT" } });
    await audit(user, `${kind}.unpublish`, kind, id);
    revalidateSite();
  });
}

/** Soft delete: hides the item everywhere and frees its slug. */
export async function softDelete(input: unknown) {
  const pre = refSchema.safeParse(input);
  return guarded(pre.success ? P(pre.data.kind, "delete") : "page.delete", refSchema, input, async ({ kind, id }, user) => {
    const now = new Date();
    if (kind === "page") {
      const p = await db.page.findUniqueOrThrow({ where: { id } });
      if (p.system) throw new UserError("System pages can't be deleted. Unpublish it instead.");
      await db.page.update({ where: { id }, data: { deletedAt: now, status: "ARCHIVED", slug: tombstone(p.slug) } });
    } else if (kind === "project") {
      const p = await db.project.findUniqueOrThrow({ where: { id } });
      await db.project.update({ where: { id }, data: { deletedAt: now, status: "ARCHIVED", slug: tombstone(p.slug) } });
    } else if (kind === "service") {
      const s = await db.service.findUniqueOrThrow({ where: { id } });
      await db.service.update({ where: { id }, data: { deletedAt: now, status: "ARCHIVED", slug: tombstone(s.slug) } });
    } else {
      const a = await db.article.findUniqueOrThrow({ where: { id } });
      await db.article.update({ where: { id }, data: { deletedAt: now, status: "ARCHIVED", slug: tombstone(a.slug) } });
    }
    await audit(user, `${kind}.delete`, kind, id);
    revalidateSite();
  });
}

export async function previewLink(input: unknown) {
  const pre = refSchema.safeParse(input);
  return guarded(pre.success ? P(pre.data.kind, "read") : "page.read", refSchema, input, async ({ kind, id }) => {
    return `/api/preview?token=${encodeURIComponent(signPreviewToken(kind, id))}`;
  });
}

export async function listRevisions(input: unknown) {
  const { kind, id } = refSchema.parse(input);
  await requirePermission(P(kind, "read"));
  return db.contentRevision.findMany({
    where: { entityType: kind, entityId: id },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { id: true, note: true, createdAt: true, author: { select: { name: true } } },
  });
}

/** Restores fields and draft sections from a revision. Does not publish. */
export async function restoreRevision(input: unknown) {
  const schema = z.object({ revisionId: idSchema });
  const rev0 = schema.safeParse(input).success ? await db.contentRevision.findUnique({ where: { id: (input as { revisionId: string }).revisionId } }) : null;
  const kind = (rev0?.entityType ?? "page") as Kind;
  return guarded(P(kind, "write"), schema, input, async ({ revisionId }, user) => {
    const rev = await db.contentRevision.findUniqueOrThrow({ where: { id: revisionId } });
    const snap = rev.snapshot as Record<string, unknown> & { sections?: { type: string; data: Prisma.JsonValue; enabled: boolean; label: string | null }[] };
    const id = rev.entityId;
    await db.$transaction(async (tx) => {
      await saveRevision(tx, kind, id, await snapshotOf(tx, kind, id), user.id, "Before restore");
      const owner = kind === "page" ? { pageId: id } : kind === "project" ? { projectId: id } : { serviceId: id };
      if (kind !== "article" && snap.sections) {
        await tx.pageSection.deleteMany({ where: owner });
        await tx.pageSection.createMany({
          data: snap.sections.map((s, i) => ({ type: s.type, data: s.data as Prisma.InputJsonValue, enabled: s.enabled, label: s.label, order: i, ...owner })),
        });
      }
      const pick = (keys: string[]) => Object.fromEntries(keys.filter((k) => k in snap).map((k) => [k, snap[k]]));
      if (kind === "page") await tx.page.update({ where: { id }, data: pick(["title"]) });
      if (kind === "project") await tx.project.update({ where: { id }, data: pick(["title", "client", "year", "location", "summary", "lead", "servicesText", "coverId", "videoId", "wallAspect"]) });
      if (kind === "service") await tx.service.update({ where: { id }, data: pick(["title", "tagline", "summary", "offerings", "coverId"]) });
      if (kind === "article") await tx.article.update({ where: { id }, data: { ...pick(["title", "excerpt", "coverId"]), body: (snap.body ?? undefined) as Prisma.InputJsonValue } });
    });
    await audit(user, `${kind}.restore`, kind, id, { revisionId });
    revalidateSite();
  });
}

/** Lightweight lists for reference pickers in the section editor. */
export async function pickerOptions(entity: unknown) {
  const e = z.enum(["project", "service", "article"]).parse(entity);
  await requirePermission(`${e}.read` as PermissionKey);
  if (e === "project")
    return (await db.project.findMany({ where: { deletedAt: null }, orderBy: { title: "asc" }, select: { id: true, title: true, status: true, isCaseStudy: true } })).map((p) => ({ id: p.id, label: p.title, meta: `${p.isCaseStudy ? "Case study" : "Wall"} · ${p.status.toLowerCase()}` }));
  if (e === "service") return (await db.service.findMany({ where: { deletedAt: null }, orderBy: { order: "asc" }, select: { id: true, title: true, status: true } })).map((s) => ({ id: s.id, label: s.title, meta: s.status.toLowerCase() }));
  return (await db.article.findMany({ where: { deletedAt: null }, orderBy: { publishedAt: "desc" }, select: { id: true, title: true, status: true } })).map((a) => ({ id: a.id, label: a.title, meta: a.status.toLowerCase() }));
}
