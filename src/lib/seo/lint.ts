/**
 * SEO checks for the admin dashboard. Pure functions (unit-tested) + a loader that runs them
 * across every page, case study, service and article.
 */
export type Severity = "error" | "warning" | "info";
export type Issue = { code: string; severity: Severity; message: string };

export type LintInput = {
  title: string; // entity title (fallback)
  seoTitle?: string | null;
  description?: string | null; // effective description (seo → excerpt/summary)
  focusKeyword?: string | null;
  robotsIndex?: boolean;
  inSitemap?: boolean;
  hasOgImage: boolean;
  slug: string;
  h1?: string | null;
  titleTemplate?: string;
};

export function effectiveTitle(i: Pick<LintInput, "seoTitle" | "title" | "titleTemplate">) {
  return i.seoTitle?.trim() || (i.titleTemplate || "%s").replace("%s", i.title);
}

export function lintEntry(i: LintInput): Issue[] {
  const out: Issue[] = [];
  const title = effectiveTitle(i);
  if (!i.seoTitle?.trim()) out.push({ code: "title.default", severity: "info", message: "No custom SEO title — using the page title with the site template." });
  if (title.length > 60) out.push({ code: "title.long", severity: "warning", message: `Title is ${title.length} characters; aim for 60 or fewer.` });
  if (title.length < 20) out.push({ code: "title.short", severity: "warning", message: `Title is only ${title.length} characters; aim for 30–60.` });
  const d = i.description?.trim() ?? "";
  if (!d) out.push({ code: "description.missing", severity: "error", message: "Missing meta description." });
  else if (d.length > 160) out.push({ code: "description.long", severity: "warning", message: `Description is ${d.length} characters; search engines usually show ~155.` });
  else if (d.length < 70) out.push({ code: "description.short", severity: "warning", message: `Description is ${d.length} characters; aim for 70–155.` });
  if (!i.hasOgImage) out.push({ code: "og.missing", severity: "warning", message: "No social share image (falls back to the site default)." });
  if (i.focusKeyword?.trim()) {
    const kw = i.focusKeyword.trim().toLowerCase();
    if (!title.toLowerCase().includes(kw)) out.push({ code: "keyword.title", severity: "warning", message: `Focus keyword “${i.focusKeyword}” isn't in the title.` });
    if (d && !d.toLowerCase().includes(kw)) out.push({ code: "keyword.description", severity: "info", message: `Focus keyword isn't in the description.` });
    const slugWords = kw.split(/\s+/).filter((w) => w.length > 2);
    if (slugWords.length && !slugWords.some((w) => i.slug.includes(w))) out.push({ code: "keyword.slug", severity: "info", message: "Focus keyword doesn't appear in the URL." });
  }
  if (i.robotsIndex === false && i.inSitemap !== false) out.push({ code: "robots.sitemap", severity: "warning", message: "Page is set to noindex but still listed in the sitemap (it will be skipped)." });
  if (i.robotsIndex === false) out.push({ code: "robots.noindex", severity: "info", message: "Page is hidden from search engines (noindex)." });
  return out;
}

/** Flags duplicate effective titles across all entries. */
export function duplicateTitles(entries: { key: string; title: string }[]) {
  const seen = new Map<string, string[]>();
  for (const e of entries) {
    const k = e.title.trim().toLowerCase();
    seen.set(k, [...(seen.get(k) ?? []), e.key]);
  }
  return new Set([...seen.values()].filter((v) => v.length > 1).flat());
}
