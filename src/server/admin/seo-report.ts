import "server-only";
import { db } from "@/lib/db";
import { duplicateTitles, effectiveTitle, lintEntry, type Issue } from "@/lib/seo/lint";
import { getSettings } from "@/server/queries";

export type SeoRow = { key: string; kind: string; label: string; path: string; editHref: string; status: string; title: string; issues: Issue[] };

/** Runs SEO checks across all live-or-draft content. */
export async function loadSeoReport() {
  const settings = await getSettings();
  const tpl = settings.seoDefaults.titleTemplate || `%s | ${settings.siteName}`;
  const [pages, services, projects, articles] = await Promise.all([
    db.page.findMany({ where: { deletedAt: null }, include: { seo: true } }),
    db.service.findMany({ where: { deletedAt: null }, include: { seo: true } }),
    db.project.findMany({ where: { deletedAt: null, isCaseStudy: true }, include: { seo: true } }),
    db.article.findMany({ where: { deletedAt: null }, include: { seo: true } }),
  ]);
  const rows: SeoRow[] = [];
  const push = (kind: string, id: string, label: string, path: string, edit: string, status: string, seo: (typeof pages)[number]["seo"], fallbackDesc: string | null, hasCover: boolean, slug: string) => {
    const title = path === "/" ? seo?.title || settings.siteName : effectiveTitle({ seoTitle: seo?.title, title: label, titleTemplate: tpl });
    rows.push({
      key: `${kind}:${id}`, kind, label, path, editHref: edit, status, title,
      issues: lintEntry({
        title: label, seoTitle: seo?.title, description: seo?.description || fallbackDesc || settings.seoDefaults.description,
        focusKeyword: seo?.focusKeyword, robotsIndex: seo?.robotsIndex, inSitemap: seo?.inSitemap,
        hasOgImage: !!seo?.ogImageId || hasCover, slug, titleTemplate: tpl,
      }),
    });
  };
  pages.forEach((p) => push("Page", p.id, p.title, p.slug ? `/${p.slug}` : "/", `/admin/pages/${p.id}`, p.status, p.seo, null, false, p.slug));
  services.forEach((s) => push("Service", s.id, s.title, `/expertise/${s.slug}`, `/admin/services/${s.id}`, s.status, s.seo, s.summary, !!s.coverId, s.slug));
  projects.forEach((p) => push("Case study", p.id, p.title, `/case-studies/${p.slug}`, `/admin/projects/${p.id}`, p.status, p.seo, p.summary, !!p.coverId, p.slug));
  articles.forEach((a) => push("Article", a.id, a.title, `/newsroom/${a.slug}`, `/admin/articles/${a.id}`, a.status, a.seo, a.excerpt, !!a.coverId, a.slug));

  const dupes = duplicateTitles(rows.filter((r) => r.status === "PUBLISHED").map((r) => ({ key: r.key, title: r.title })));
  for (const r of rows) if (dupes.has(r.key)) r.issues.unshift({ code: "title.duplicate", severity: "error", message: "Another published page uses the same title." });
  const missingAlt = await db.media.count({ where: { deletedAt: null, kind: "IMAGE", alt: "", posterOf: { none: {} } } });
  return { rows, missingAlt };
}
