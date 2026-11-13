import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/utils";

export const revalidate = 3600;

/** XML sitemap from published, indexable, sitemap-enabled content. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const include = { OR: [{ seoId: null }, { seo: { robotsIndex: true, inSitemap: true } }] };
  const [pages, services, projects, articles] = await Promise.all([
    db.page.findMany({ where: { status: "PUBLISHED", deletedAt: null, ...include }, select: { slug: true, updatedAt: true } }),
    db.service.findMany({ where: { status: "PUBLISHED", deletedAt: null, ...include }, select: { slug: true, updatedAt: true } }),
    db.project.findMany({ where: { status: "PUBLISHED", deletedAt: null, isCaseStudy: true, ...include }, select: { slug: true, updatedAt: true } }),
    db.article.findMany({ where: { status: "PUBLISHED", deletedAt: null, publishedAt: { lte: new Date() }, ...include }, select: { slug: true, updatedAt: true } }),
  ]);
  return [
    ...pages.map((p) => ({ url: siteUrl(p.slug ? `/${p.slug}` : "/"), lastModified: p.updatedAt, changeFrequency: "weekly" as const, priority: p.slug ? 0.7 : 1 })),
    ...services.map((s) => ({ url: siteUrl(`/expertise/${s.slug}`), lastModified: s.updatedAt, changeFrequency: "monthly" as const, priority: 0.8 })),
    ...projects.map((p) => ({ url: siteUrl(`/case-studies/${p.slug}`), lastModified: p.updatedAt, changeFrequency: "monthly" as const, priority: 0.6 })),
    ...articles.map((a) => ({ url: siteUrl(`/newsroom/${a.slug}`), lastModified: a.updatedAt, changeFrequency: "yearly" as const, priority: 0.5 })),
  ];
}
