"use server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { parseSectionData, getSectionDef } from "@/sections/registry";
import type { PermissionKey } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { guarded, idSchema, UserError, audit, revalidateSite } from "./guard";

/**
 * Section builder actions. Sections are the working copy (draft); publishing snapshots them.
 * Owner = a page, project or service. Permission follows the owner type.
 */
const ownerSchema = z.object({ type: z.enum(["page", "project", "service"]), id: idSchema });
type Owner = z.infer<typeof ownerSchema>;

const permFor = (o: Owner["type"]): PermissionKey => (o === "page" ? "page.write" : o === "project" ? "project.write" : "service.write");
const ownerWhere = (o: Owner) => (o.type === "page" ? { pageId: o.id } : o.type === "project" ? { projectId: o.id } : { serviceId: o.id });

async function touchOwner(tx: Prisma.TransactionClient, o: Owner) {
  const data = { updatedAt: new Date() };
  if (o.type === "page") await tx.page.update({ where: { id: o.id }, data });
  else if (o.type === "project") await tx.project.update({ where: { id: o.id }, data });
  else await tx.service.update({ where: { id: o.id }, data });
}

export async function listSections(owner: unknown) {
  const o = ownerSchema.parse(owner);
  await requirePermission(o.type === "page" ? "page.read" : o.type === "project" ? "project.read" : "service.read");
  return db.pageSection.findMany({ where: ownerWhere(o), orderBy: { order: "asc" } });
}

export async function addSection(input: unknown) {
  const schema = z.object({ owner: ownerSchema, type: z.string(), templateId: z.string().optional(), afterId: z.string().optional() });
  const pre = schema.safeParse(input);
  const perm = pre.success ? permFor(pre.data.owner.type) : "page.write";
  return guarded(perm, schema, input, async ({ owner, type, templateId, afterId }, user) => {
    let data: unknown;
    let sectionType = type;
    if (templateId) {
      const t = await db.sectionTemplate.findUnique({ where: { id: templateId } });
      if (!t) throw new UserError("Template not found.");
      sectionType = t.type;
      data = t.data;
    } else {
      const def = getSectionDef(type);
      if (!def) throw new UserError("Unknown section type.");
      data = def.defaults();
    }
    const parsed = parseSectionData(sectionType, data);
    if (!parsed.ok) throw new UserError(parsed.error);
    return db.$transaction(async (tx) => {
      const list = await tx.pageSection.findMany({ where: ownerWhere(owner), orderBy: { order: "asc" }, select: { id: true } });
      const at = afterId ? list.findIndex((s) => s.id === afterId) + 1 : list.length;
      const row = await tx.pageSection.create({
        data: { type: sectionType, data: parsed.data as Prisma.InputJsonValue, order: at, ...ownerWhere(owner) },
      });
      const ids = [...list.map((s) => s.id)];
      ids.splice(at, 0, row.id);
      await Promise.all(ids.map((id, i) => tx.pageSection.update({ where: { id }, data: { order: i } })));
      await touchOwner(tx, owner);
      await audit(user, "section.add", owner.type, owner.id, { type: sectionType });
      return row;
    });
  });
}

export async function updateSection(input: unknown) {
  const schema = z.object({ owner: ownerSchema, id: idSchema, data: z.record(z.string(), z.unknown()), label: z.string().max(120).nullish() });
  const pre = schema.safeParse(input);
  return guarded(pre.success ? permFor(pre.data.owner.type) : "page.write", schema, input, async ({ owner, id, data, label }, user) => {
    const row = await db.pageSection.findFirst({ where: { id, ...ownerWhere(owner) } });
    if (!row) throw new UserError("Section not found.");
    const parsed = parseSectionData(row.type, data);
    if (!parsed.ok) throw new UserError(`Invalid content: ${parsed.error}`);
    await db.$transaction(async (tx) => {
      await tx.pageSection.update({ where: { id }, data: { data: parsed.data as Prisma.InputJsonValue, label: label ?? row.label } });
      await touchOwner(tx, owner);
    });
    await audit(user, "section.update", owner.type, owner.id, { section: id, type: row.type });
    return parsed.data;
  });
}

export async function reorderSections(input: unknown) {
  const schema = z.object({ owner: ownerSchema, ids: z.array(idSchema).max(200) });
  const pre = schema.safeParse(input);
  return guarded(pre.success ? permFor(pre.data.owner.type) : "page.write", schema, input, async ({ owner, ids }) => {
    const existing = await db.pageSection.findMany({ where: ownerWhere(owner), select: { id: true } });
    const set = new Set(existing.map((e) => e.id));
    if (ids.length !== set.size || !ids.every((i) => set.has(i))) throw new UserError("Section list changed — reload and try again.");
    await db.$transaction(async (tx) => {
      await Promise.all(ids.map((id, i) => tx.pageSection.update({ where: { id }, data: { order: i } })));
      await touchOwner(tx, owner);
    });
  });
}

export async function toggleSection(input: unknown) {
  const schema = z.object({ owner: ownerSchema, id: idSchema, enabled: z.boolean() });
  const pre = schema.safeParse(input);
  return guarded(pre.success ? permFor(pre.data.owner.type) : "page.write", schema, input, async ({ owner, id, enabled }) => {
    await db.$transaction(async (tx) => {
      const r = await tx.pageSection.updateMany({ where: { id, ...ownerWhere(owner) }, data: { enabled } });
      if (!r.count) throw new UserError("Section not found.");
      await touchOwner(tx, owner);
    });
  });
}

export async function duplicateSection(input: unknown) {
  const schema = z.object({ owner: ownerSchema, id: idSchema });
  const pre = schema.safeParse(input);
  return guarded(pre.success ? permFor(pre.data.owner.type) : "page.write", schema, input, async ({ owner, id }) => {
    return db.$transaction(async (tx) => {
      const list = await tx.pageSection.findMany({ where: ownerWhere(owner), orderBy: { order: "asc" } });
      const idx = list.findIndex((s) => s.id === id);
      if (idx < 0) throw new UserError("Section not found.");
      const src = list[idx];
      const copy = await tx.pageSection.create({
        data: { type: src.type, data: src.data as Prisma.InputJsonValue, label: src.label ? `${src.label} (copy)` : null, enabled: src.enabled, order: idx + 1, ...ownerWhere(owner) },
      });
      const ids = list.map((s) => s.id);
      ids.splice(idx + 1, 0, copy.id);
      await Promise.all(ids.map((sid, i) => tx.pageSection.update({ where: { id: sid }, data: { order: i } })));
      await touchOwner(tx, owner);
      return copy;
    });
  });
}

export async function deleteSection(input: unknown) {
  const schema = z.object({ owner: ownerSchema, id: idSchema });
  const pre = schema.safeParse(input);
  return guarded(pre.success ? permFor(pre.data.owner.type) : "page.write", schema, input, async ({ owner, id }, user) => {
    await db.$transaction(async (tx) => {
      const r = await tx.pageSection.deleteMany({ where: { id, ...ownerWhere(owner) } });
      if (!r.count) throw new UserError("Section not found.");
      const rest = await tx.pageSection.findMany({ where: ownerWhere(owner), orderBy: { order: "asc" }, select: { id: true } });
      await Promise.all(rest.map((s, i) => tx.pageSection.update({ where: { id: s.id }, data: { order: i } })));
      await touchOwner(tx, owner);
    });
    await audit(user, "section.delete", owner.type, owner.id, { section: id });
  });
}

export async function saveSectionAsTemplate(input: unknown) {
  const schema = z.object({ id: idSchema, name: z.string().trim().min(1).max(120) });
  return guarded("template.write", schema, input, async ({ id, name }) => {
    const s = await db.pageSection.findUnique({ where: { id } });
    if (!s) throw new UserError("Section not found.");
    return db.sectionTemplate.create({ data: { name, type: s.type, data: s.data as Prisma.InputJsonValue } });
  });
}

export async function listTemplates() {
  await requirePermission("page.read");
  return db.sectionTemplate.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, type: true } });
}

export async function deleteTemplate(input: unknown) {
  return guarded("template.write", z.object({ id: idSchema }), input, async ({ id }) => {
    await db.sectionTemplate.delete({ where: { id } });
  });
}

export async function renameTemplate(input: unknown) {
  return guarded("template.write", z.object({ id: idSchema, name: z.string().trim().min(1).max(120) }), input, async ({ id, name }) => {
    await db.sectionTemplate.update({ where: { id }, data: { name } });
    revalidateSite();
  });
}
