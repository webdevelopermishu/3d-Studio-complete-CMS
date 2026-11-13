import "server-only";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { AuthError, requirePermission, type CurrentUser } from "@/lib/auth/session";
import type { PermissionKey } from "@/lib/auth/permissions";
import { logger } from "@/lib/logger";

export type ActionResult<T = undefined> = { ok: true; data?: T; message?: string } | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** Standard pipeline for admin mutations: authorise → validate → run → map errors. */
export async function guarded<S extends z.ZodType, T>(
  perm: PermissionKey | PermissionKey[],
  schema: S,
  input: unknown,
  run: (data: z.infer<S>, user: CurrentUser) => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    const user = await requirePermission(...(Array.isArray(perm) ? perm : [perm]));
    const parsed = schema.safeParse(input);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const i of parsed.error.issues) fieldErrors[i.path.join(".") || "_"] ??= i.message;
      return { ok: false, error: "Please fix the highlighted fields.", fieldErrors };
    }
    const data = await run(parsed.data, user);
    return { ok: true, data };
  } catch (e) {
    return toError(e);
  }
}

export function toError(e: unknown): { ok: false; error: string; fieldErrors?: Record<string, string> } {
  if (e instanceof AuthError) return { ok: false, error: e.message };
  if (e instanceof UserError) return { ok: false, error: e.message, fieldErrors: e.field ? { [e.field]: e.message } : undefined };
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2002") {
      const target = String((e.meta?.target as string[] | undefined)?.join(", ") ?? "field");
      const field = target.includes("slug") ? "slug" : target.includes("email") ? "email" : target.includes("source") ? "source" : target;
      return { ok: false, error: `That ${field} is already in use.`, fieldErrors: { [field]: `This ${field} is already in use.` } };
    }
    if (e.code === "P2025") return { ok: false, error: "This item no longer exists." };
  }
  // next/navigation redirect() / notFound() must propagate
  if (e && typeof e === "object" && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_")) throw e;
  logger.error("admin.action_failed", { error: e instanceof Error ? e.stack ?? e.message : String(e) });
  return { ok: false, error: "Something went wrong. The error has been logged." };
}

export class UserError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
  }
}

/** Purge cached public pages after a content change. */
export function revalidateSite() {
  revalidatePath("/", "layout");
}

export async function audit(user: CurrentUser | null, action: string, entityType?: string, entityId?: string, meta?: Record<string, unknown>) {
  await db.auditLog.create({ data: { userId: user?.id, action, entityType, entityId, meta: meta as Prisma.InputJsonValue } }).catch(() => {});
}

const MAX_REVISIONS = 30;
export async function saveRevision(tx: Prisma.TransactionClient, entityType: string, entityId: string, snapshot: unknown, authorId: string | null, note?: string) {
  await tx.contentRevision.create({ data: { entityType, entityId, snapshot: snapshot as Prisma.InputJsonValue, authorId, note } });
  const old = await tx.contentRevision.findMany({ where: { entityType, entityId }, orderBy: { createdAt: "desc" }, skip: MAX_REVISIONS, select: { id: true } });
  if (old.length) await tx.contentRevision.deleteMany({ where: { id: { in: old.map((o) => o.id) } } });
}

/** Frees a unique slug when soft-deleting. */
export const tombstone = (slug: string) => `${slug}--deleted-${Date.now().toString(36)}`;

// ── Shared field schemas ────────────────────────────────────────────
export const slugSchema = z
  .string()
  .trim()
  .min(1, "Slug is required.")
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens.");
export const pagePathSchema = z
  .string()
  .trim()
  .max(200)
  .regex(/^$|^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/, "Use lowercase words separated by hyphens; “/” for nested pages.");
export const optStr = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : null));
export const idSchema = z.string().min(1).max(60);
export const RESERVED_PATHS = ["admin", "api", "media", "fonts", "_next", "case-studies", "expertise", "newsroom", "sitemap.xml", "robots.txt"];

export const seoSchema = z.object({
  title: optStr(200),
  description: optStr(400),
  canonical: optStr(500).refine((v) => !v || /^https?:\/\//.test(v), "Canonical must be an absolute URL."),
  ogTitle: optStr(200),
  ogDescription: optStr(400),
  ogImageId: optStr(60),
  twitterCard: z.enum(["summary_large_image", "summary"]).default("summary_large_image"),
  robotsIndex: z.boolean().default(true),
  robotsFollow: z.boolean().default(true),
  focusKeyword: optStr(120),
  inSitemap: z.boolean().default(true),
});
export type SeoInput = z.infer<typeof seoSchema>;

/** Upsert the SEO row attached to an entity; returns its id. */
export async function upsertSeo(tx: Prisma.TransactionClient, seoId: string | null | undefined, seo: SeoInput | undefined) {
  if (!seo) return seoId ?? null;
  if (seoId) {
    await tx.sEOSettings.update({ where: { id: seoId }, data: seo });
    return seoId;
  }
  const row = await tx.sEOSettings.create({ data: seo });
  return row.id;
}
