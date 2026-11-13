"use server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { getDriver } from "@/lib/media/storage";
import { slugify } from "@/lib/utils";
import { guarded, idSchema, optStr, revalidateSite, audit, UserError } from "./guard";
import { mediaUsage } from "./media";

// ───────────────────────── Media ─────────────────────────
const mediaListSchema = z.object({
  q: z.string().max(120).optional(),
  kind: z.enum(["IMAGE", "VIDEO", "ALL"]).default("ALL"),
  folderId: z.string().max(60).optional(),
  missingAlt: z.boolean().optional(),
  page: z.number().int().min(1).max(500).default(1),
});

export async function listMedia(input: unknown) {
  await requirePermission("media.read");
  const { q, kind, folderId, missingAlt, page } = mediaListSchema.parse(input ?? {});
  const where: Prisma.MediaWhereInput = {
    deletedAt: null,
    posterOf: { none: {} }, // hide auto-generated video posters
    ...(kind !== "ALL" ? { kind } : {}),
    ...(folderId ? { folderId: folderId === "none" ? null : folderId } : {}),
    ...(missingAlt ? { alt: "" , kind: "IMAGE" } : {}),
    ...(q ? { OR: [{ filename: { contains: q, mode: "insensitive" } }, { title: { contains: q, mode: "insensitive" } }, { alt: { contains: q, mode: "insensitive" } }] } : {}),
  };
  const take = 48;
  const [items, total] = await Promise.all([
    db.media.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * take, take, include: { poster: { select: { url: true } } } }),
    db.media.count({ where }),
  ]);
  return { items, total, pages: Math.max(1, Math.ceil(total / take)), page };
}

export async function getMediaDetail(id: unknown) {
  await requirePermission("media.read");
  const mid = idSchema.parse(id);
  const m = await db.media.findUnique({ where: { id: mid }, include: { poster: { select: { url: true } }, folder: true, uploadedBy: { select: { name: true } } } });
  if (!m) return null;
  return { ...m, usage: await mediaUsage(mid) };
}

export async function updateMedia(input: unknown) {
  const schema = z.object({ id: idSchema, alt: z.string().trim().max(300), title: optStr(200), description: optStr(1000), folderId: optStr(60) });
  return guarded("media.write", schema, input, async ({ id, ...data }, user) => {
    await db.media.update({ where: { id }, data });
    await audit(user, "media.update", "media", id);
    revalidateSite();
  });
}

export async function deleteMedia(input: unknown) {
  const schema = z.object({ id: idSchema, force: z.boolean().default(false) });
  return guarded("media.delete", schema, input, async ({ id, force }, user) => {
    const usage = await mediaUsage(id);
    if (usage.length && !force) throw new UserError(`This file is used in ${usage.length} place(s). Remove it there first, or delete anyway.`);
    const m = await db.media.findUniqueOrThrow({ where: { id } });
    await db.media.update({ where: { id }, data: { deletedAt: new Date() } });
    // Remove the stored file; the row is kept (soft-deleted) for audit/history.
    await getDriver(m.provider).remove(m.key, m.kind).catch(() => {});
    if (m.posterId) await db.media.update({ where: { id: m.posterId }, data: { deletedAt: new Date() } }).catch(() => {});
    await audit(user, "media.delete", "media", id, { forced: force && usage.length > 0 });
    revalidateSite();
  });
}

export async function listFolders() {
  await requirePermission("media.read");
  return db.mediaFolder.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { media: { where: { deletedAt: null } } } } } });
}

export async function saveFolder(input: unknown) {
  return guarded("media.write", z.object({ id: idSchema.optional(), name: z.string().trim().min(1).max(80) }), input, async ({ id, name }) => {
    return id ? db.mediaFolder.update({ where: { id }, data: { name } }) : db.mediaFolder.create({ data: { name } });
  });
}

export async function deleteFolder(input: unknown) {
  return guarded("media.write", z.object({ id: idSchema }), input, async ({ id }) => {
    await db.media.updateMany({ where: { folderId: id }, data: { folderId: null } });
    await db.mediaFolder.delete({ where: { id } });
  });
}

// ───────────────────────── Taxonomies ─────────────────────────
const taxModel = z.enum(["category", "deliverable", "industry"]);
function taxDelegate(t: z.infer<typeof taxModel>) {
  return (t === "category" ? db.projectCategory : t === "deliverable" ? db.deliverable : db.industry) as unknown as {
    create: (a: object) => Promise<unknown>; update: (a: object) => Promise<unknown>; delete: (a: object) => Promise<unknown>;
  };
}

export async function saveTerm(input: unknown) {
  const schema = z.object({ model: taxModel, id: idSchema.optional(), name: z.string().trim().min(1).max(80), slug: z.string().trim().max(80).optional(), order: z.number().int().min(0).max(1000).default(0) });
  return guarded("taxonomy.write", schema, input, async ({ model, id, name, slug, order }, user) => {
    const data = { name, slug: slugify(slug || name), order };
    if (!data.slug) throw new UserError("Slug can't be empty.", "slug");
    const d = taxDelegate(model);
    if (id) await d.update({ where: { id }, data });
    else await d.create({ data });
    await audit(user, "taxonomy.save", model, id);
    revalidateSite();
  });
}

export async function deleteTerm(input: unknown) {
  return guarded("taxonomy.write", z.object({ model: taxModel, id: idSchema }), input, async ({ model, id }, user) => {
    await taxDelegate(model).delete({ where: { id } });
    await audit(user, "taxonomy.delete", model, id);
    revalidateSite();
  });
}

// ───────────────────────── Navigation ─────────────────────────
const itemSchema = z.object({
  id: z.string().max(60).optional(),
  label: z.string().trim().min(1, "Label is required.").max(80),
  href: z.string().trim().min(1, "Link is required.").max(500).refine((h) => /^(\/|#|https?:\/\/|mailto:|tel:)/.test(h), "Use a path (/work), a full URL, mailto: or tel:"),
  newTab: z.boolean().default(false),
  enabled: z.boolean().default(true),
});

export async function saveMenu(input: unknown) {
  const schema = z.object({ menuId: idSchema, items: z.array(itemSchema).max(40) });
  return guarded("navigation.write", schema, input, async ({ menuId, items }, user) => {
    await db.$transaction(async (tx) => {
      await tx.navigationItem.deleteMany({ where: { menuId } });
      await tx.navigationItem.createMany({ data: items.map((it, order) => ({ menuId, label: it.label, href: it.href, newTab: it.newTab, enabled: it.enabled, order })) });
    });
    await audit(user, "navigation.save", "menu", menuId, { count: items.length });
    revalidateSite();
  });
}

// ───────────────────────── Redirects ─────────────────────────
const pathRule = z.string().trim().min(1).max(500);
export async function saveRedirect(input: unknown) {
  const schema = z.object({
    id: idSchema.optional(),
    source: pathRule.refine((s) => s.startsWith("/") && !s.startsWith("//") && !/^\/(admin|api|_next|media)(\/|$)/.test(s), "Source must be a site path like /old-page (not /admin, /api, /media)."),
    destination: pathRule.refine((d) => d.startsWith("/") || /^https?:\/\//.test(d), "Destination must be a path or a full URL."),
    permanent: z.boolean().default(true),
    enabled: z.boolean().default(true),
    note: optStr(200),
  });
  return guarded("seo.write", schema, input, async ({ id, ...d }, user) => {
    const source = d.source.length > 1 ? d.source.replace(/\/+$/, "").toLowerCase() : d.source;
    if (source === d.destination.replace(/\/+$/, "").toLowerCase()) throw new UserError("A redirect can't point to itself.", "destination");
    const loop = await db.redirect.findUnique({ where: { source: d.destination.toLowerCase() } });
    if (loop && loop.destination.toLowerCase() === source && loop.id !== id) throw new UserError("This would create a redirect loop.", "destination");
    if (id) await db.redirect.update({ where: { id }, data: { ...d, source } });
    else await db.redirect.create({ data: { ...d, source } });
    await audit(user, "redirect.save", "redirect", id, { source });
  });
}

export async function deleteRedirect(input: unknown) {
  return guarded("seo.write", z.object({ id: idSchema }), input, async ({ id }, user) => {
    await db.redirect.delete({ where: { id } });
    await audit(user, "redirect.delete", "redirect", id);
  });
}
