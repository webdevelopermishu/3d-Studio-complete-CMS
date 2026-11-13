import "server-only";
import type { Prisma } from "@prisma/client";
import type { SEOSettings } from "@prisma/client";

type Row = { id: string; type: string; enabled: boolean; data: Prisma.JsonValue };

/** True when the working sections differ from the last published snapshot. */
export function hasUnpublishedChanges(draft: Row[], published: Prisma.JsonValue | null) {
  const pub = Array.isArray(published) ? (published as unknown as Row[]) : [];
  const norm = (l: Row[]) => JSON.stringify(l.map((s) => [s.type, s.enabled, s.data]));
  return norm(draft) !== norm(pub);
}

export function seoForForm(seo: SEOSettings | null) {
  return {
    title: seo?.title ?? null, description: seo?.description ?? null, canonical: seo?.canonical ?? null, ogTitle: seo?.ogTitle ?? null,
    ogDescription: seo?.ogDescription ?? null, ogImageId: seo?.ogImageId ?? null, twitterCard: seo?.twitterCard ?? "summary_large_image",
    robotsIndex: seo?.robotsIndex ?? true, robotsFollow: seo?.robotsFollow ?? true, focusKeyword: seo?.focusKeyword ?? null, inSitemap: seo?.inSitemap ?? true,
  };
}
