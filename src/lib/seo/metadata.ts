import "server-only";
import type { Metadata } from "next";
import type { SEOSettings } from "@prisma/client";
import { siteUrl } from "@/lib/utils";
import type { MediaRef } from "@/lib/media/url";
import { getMediaMap, type Settings } from "@/server/queries";

export function ogImageUrl(m: MediaRef | null | undefined): string | undefined {
  if (!m) return undefined;
  const src = m.kind === "VIDEO" ? m.poster : m;
  if (!src) return undefined;
  if (src.url.includes("res.cloudinary.com") && src.url.includes("/upload/")) {
    return src.url.replace("/upload/", "/upload/c_fill,g_auto,w_1200,h_630,f_jpg,q_auto/");
  }
  return siteUrl(src.url.startsWith("/media/") ? `${src.url}?w=1440&q=80` : src.url);
}

type Input = {
  settings: Settings;
  /** Human title of the entity (used when SEO title is empty) */
  title: string;
  seo?: SEOSettings | null;
  description?: string | null;
  path: string;
  image?: MediaRef | null;
  type?: "website" | "article";
  publishedTime?: Date | null;
  noindex?: boolean;
};

/** Server-generated metadata with sensible fallbacks: SEO fields → entity fields → site defaults. */
export async function buildMetadata(i: Input): Promise<Metadata> {
  const seo = i.seo;
  const ogMedia = seo?.ogImageId ? (await getMediaMap([seo.ogImageId])).get(seo.ogImageId) : null;
  const template = i.settings.seoDefaults.titleTemplate || `%s | ${i.settings.siteName}`;
  const title = seo?.title?.trim() || (i.path === "/" ? i.settings.siteName : template.replace("%s", i.title));
  const description = seo?.description?.trim() || i.description?.trim() || i.settings.seoDefaults.description || i.settings.tagline || undefined;
  const canonical = seo?.canonical?.trim() || siteUrl(i.path);
  const image = ogImageUrl(ogMedia ?? i.image ?? i.settings.ogImage);
  const index = !i.noindex && (seo?.robotsIndex ?? true);
  const follow = seo?.robotsFollow ?? true;

  return {
    title: { absolute: title },
    description,
    alternates: { canonical },
    robots: { index, follow, googleBot: { index, follow, "max-image-preview": "large" } },
    openGraph: {
      title: seo?.ogTitle?.trim() || title,
      description: seo?.ogDescription?.trim() || description,
      url: canonical,
      siteName: i.settings.siteName,
      type: i.type ?? "website",
      locale: "en_US",
      ...(i.publishedTime ? { publishedTime: i.publishedTime.toISOString() } : {}),
      images: image ? [{ url: image, width: 1200, height: 630 }] : undefined,
    },
    twitter: {
      card: (seo?.twitterCard as "summary_large_image" | "summary") || "summary_large_image",
      title: seo?.ogTitle?.trim() || title,
      description: seo?.ogDescription?.trim() || description,
      images: image ? [image] : undefined,
      site: i.settings.seoDefaults.twitterHandle || undefined,
    },
  };
}
