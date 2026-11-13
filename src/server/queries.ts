import "server-only";
import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { MediaRef } from "@/lib/media/url";
import type { SectionRecord } from "@/sections/registry";

// ───────────────────────── media ─────────────────────────
export const mediaSelect = {
  id: true, kind: true, provider: true, url: true, width: true, height: true, alt: true, blurDataUrl: true,
  poster: { select: { id: true, kind: true, provider: true, url: true, width: true, height: true, alt: true, blurDataUrl: true } },
} satisfies Prisma.MediaSelect;

type MediaRow = Prisma.MediaGetPayload<{ select: typeof mediaSelect }>;
export function toMediaRef(m: MediaRow | null | undefined): MediaRef | null {
  if (!m) return null;
  return { ...m, poster: m.poster ? { ...m.poster, poster: null } : null };
}

export async function getMediaMap(ids: Iterable<string>): Promise<Map<string, MediaRef>> {
  const list = [...new Set(ids)].filter(Boolean);
  if (!list.length) return new Map();
  const rows = await db.media.findMany({ where: { id: { in: list }, deletedAt: null }, select: mediaSelect });
  return new Map(rows.map((r) => [r.id, toMediaRef(r)!]));
}

// ───────────────────────── settings & navigation ─────────────────────────
export type Theme = { accent?: string; accentHi?: string; accentLo?: string; background?: string; text?: string; font?: string };
export type Features = { showLoader?: boolean; customCursor?: boolean; smoothScroll?: boolean };
export type SeoDefaults = { titleTemplate?: string; description?: string; ogImageId?: string; twitterHandle?: string };

export const getSettings = cache(async () => {
  const s = await db.globalSettings.findUnique({ where: { id: "global" } });
  const mediaIds = [s?.logoId, s?.logoMarkId, s?.faviconId, (s?.seoDefaults as SeoDefaults | undefined)?.ogImageId].filter(Boolean) as string[];
  const media = await getMediaMap(mediaIds);
  const seoDefaults = (s?.seoDefaults ?? {}) as SeoDefaults;
  return {
    siteName: s?.siteName ?? "Studio",
    tagline: s?.tagline ?? "",
    email: s?.email ?? "",
    phone: s?.phone ?? "",
    address: s?.address ?? "",
    logo: s?.logoId ? media.get(s.logoId) ?? null : null,
    logoMark: s?.logoMarkId ? media.get(s.logoMarkId) ?? null : null,
    favicon: s?.faviconId ? media.get(s.faviconId) ?? null : null,
    theme: (s?.theme ?? {}) as Theme,
    features: { showLoader: true, customCursor: true, smoothScroll: true, ...((s?.features ?? {}) as Features) },
    seoDefaults,
    ogImage: seoDefaults.ogImageId ? media.get(seoDefaults.ogImageId) ?? null : null,
    footerCta: s?.footerCta ?? "Let's talk",
    copyright: s?.copyright ?? `© ${s?.siteName ?? "Studio"}`,
    cookieText: s?.cookieText ?? "",
    analyticsId: s?.analyticsId ?? "",
  };
});
export type Settings = Awaited<ReturnType<typeof getSettings>>;

export type NavLink = { label: string; href: string; newTab: boolean };
export const getMenus = cache(async (): Promise<Record<string, NavLink[]>> => {
  const menus = await db.navigationMenu.findMany({
    include: { items: { where: { enabled: true }, orderBy: { order: "asc" } } },
  });
  return Object.fromEntries(menus.map((m) => [m.key, m.items.map((i) => ({ label: i.label, href: i.href, newTab: i.newTab }))]));
});

// ───────────────────────── sections ─────────────────────────
function draftSections(rows: { id: string; type: string; enabled: boolean; data: Prisma.JsonValue; label: string | null }[]): SectionRecord[] {
  return rows.map((r) => ({ id: r.id, type: r.type, enabled: r.enabled, data: r.data, label: r.label }));
}
function publishedSections(json: Prisma.JsonValue | null): SectionRecord[] {
  return Array.isArray(json) ? (json as unknown as SectionRecord[]) : [];
}
const sectionOrder = { orderBy: { order: "asc" as const } };

// ───────────────────────── pages ─────────────────────────
export const getPage = cache(async (slug: string, preview = false) => {
  const page = await db.page.findFirst({
    where: { slug, deletedAt: null, ...(preview ? {} : { status: "PUBLISHED" }) },
    include: { seo: true, sections: preview ? sectionOrder : false },
  });
  if (!page) return null;
  return {
    ...page,
    renderSections: preview ? draftSections(page.sections ?? []) : publishedSections(page.publishedSections),
  };
});

// ───────────────────────── services ─────────────────────────
const serviceCard = {
  id: true, title: true, slug: true, tagline: true, summary: true, offerings: true, order: true,
  cover: { select: mediaSelect },
} satisfies Prisma.ServiceSelect;
export type ServiceCard = Omit<Prisma.ServiceGetPayload<{ select: typeof serviceCard }>, "cover"> & { cover: MediaRef | null };

function mapService(s: Prisma.ServiceGetPayload<{ select: typeof serviceCard }>): ServiceCard {
  return { ...s, cover: toMediaRef(s.cover) };
}

export const listServices = cache(async (ids?: string[]): Promise<ServiceCard[]> => {
  const rows = await db.service.findMany({
    where: { status: "PUBLISHED", deletedAt: null, ...(ids?.length ? { id: { in: ids } } : {}) },
    orderBy: { order: "asc" },
    select: serviceCard,
  });
  const list = rows.map(mapService);
  return ids?.length ? ids.map((id) => list.find((x) => x.id === id)).filter(Boolean) as ServiceCard[] : list;
});

export const getService = cache(async (slug: string, preview = false) => {
  const s = await db.service.findFirst({
    where: { slug, deletedAt: null, ...(preview ? {} : { status: "PUBLISHED" }) },
    include: { seo: true, cover: { select: mediaSelect }, sections: preview ? sectionOrder : false },
  });
  if (!s) return null;
  return { ...s, coverRef: toMediaRef(s.cover), renderSections: preview ? draftSections(s.sections ?? []) : publishedSections(s.publishedSections) };
});

// ───────────────────────── projects ─────────────────────────
const projectCard = {
  id: true, title: true, slug: true, client: true, year: true, summary: true, isCaseStudy: true, wallAspect: true, featured: true,
  cover: { select: mediaSelect }, video: { select: mediaSelect },
  service: { select: { id: true, title: true, slug: true } },
  categories: { select: { id: true, name: true, slug: true } },
  deliverables: { select: { id: true, name: true, slug: true } },
  industries: { select: { id: true, name: true, slug: true } },
} satisfies Prisma.ProjectSelect;
type ProjectRow = Prisma.ProjectGetPayload<{ select: typeof projectCard }>;
export type ProjectCard = Omit<ProjectRow, "cover" | "video"> & { cover: MediaRef | null; video: MediaRef | null };
const mapProject = (p: ProjectRow): ProjectCard => ({ ...p, cover: toMediaRef(p.cover), video: toMediaRef(p.video) });

const publishedProject = { status: "PUBLISHED" as const, deletedAt: null };

export const listProjects = cache(async (opts: { ids?: string[]; caseStudies?: boolean; featured?: boolean; wall?: boolean; limit?: number } = {}) => {
  const rows = await db.project.findMany({
    where: {
      ...publishedProject,
      ...(opts.ids?.length ? { id: { in: opts.ids } } : {}),
      ...(opts.caseStudies ? { isCaseStudy: true } : {}),
      ...(opts.featured ? { featured: true } : {}),
      ...(opts.wall ? { showOnWall: true } : {}),
    },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    take: opts.limit,
    select: projectCard,
  });
  const list = rows.map(mapProject);
  return opts.ids?.length ? (opts.ids.map((id) => list.find((x) => x.id === id)).filter(Boolean) as ProjectCard[]) : list;
});

export const getProject = cache(async (slug: string, preview = false) => {
  const p = await db.project.findFirst({
    where: { slug, isCaseStudy: true, deletedAt: null, ...(preview ? {} : { status: "PUBLISHED" }) },
    include: {
      seo: true, cover: { select: mediaSelect }, video: { select: mediaSelect },
      service: { select: { title: true, slug: true } }, industries: true, categories: true, deliverables: true,
      sections: preview ? sectionOrder : false,
    },
  });
  if (!p) return null;
  return {
    ...p, coverRef: toMediaRef(p.cover), videoRef: toMediaRef(p.video),
    renderSections: preview ? draftSections(p.sections ?? []) : publishedSections(p.publishedSections),
  };
});

export const getTaxonomies = cache(async () => {
  const [categories, deliverables, industries] = await Promise.all([
    db.projectCategory.findMany({ orderBy: { order: "asc" } }),
    db.deliverable.findMany({ orderBy: { order: "asc" } }),
    db.industry.findMany({ orderBy: { order: "asc" } }),
  ]);
  return { categories, deliverables, industries };
});

// ───────────────────────── articles ─────────────────────────
const articleCard = {
  id: true, title: true, slug: true, excerpt: true, publishedAt: true, cover: { select: mediaSelect },
} satisfies Prisma.ArticleSelect;
type ArticleRow = Prisma.ArticleGetPayload<{ select: typeof articleCard }>;
export type ArticleCard = Omit<ArticleRow, "cover"> & { cover: MediaRef | null };

export const listArticles = cache(async (opts: { ids?: string[]; limit?: number } = {}): Promise<ArticleCard[]> => {
  const rows = await db.article.findMany({
    where: { status: "PUBLISHED", deletedAt: null, publishedAt: { lte: new Date() }, ...(opts.ids?.length ? { id: { in: opts.ids } } : {}) },
    orderBy: { publishedAt: "desc" },
    take: opts.limit,
    select: articleCard,
  });
  const list = rows.map((a) => ({ ...a, cover: toMediaRef(a.cover) }));
  return opts.ids?.length ? (opts.ids.map((id) => list.find((x) => x.id === id)).filter(Boolean) as ArticleCard[]) : list;
});

export const getArticle = cache(async (slug: string, preview = false) => {
  const a = await db.article.findFirst({
    where: { slug, deletedAt: null, ...(preview ? {} : { status: "PUBLISHED", publishedAt: { lte: new Date() } }) },
    include: { seo: true, cover: { select: mediaSelect }, author: { select: { name: true } }, services: { select: { title: true, slug: true } } },
  });
  if (!a) return null;
  return { ...a, coverRef: toMediaRef(a.cover) };
});

export async function getAdjacentArticles(publishedAt: Date | null, id: string) {
  if (!publishedAt) return [];
  return listArticles({ limit: 4 }).then((l) => l.filter((a) => a.id !== id).slice(0, 3));
}
