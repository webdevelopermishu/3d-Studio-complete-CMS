import { siteUrl } from "@/lib/utils";
import type { Settings } from "@/server/queries";

/** Renders a JSON-LD <script>. `<` is escaped so CMS content can't break out of the tag. */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export function organizationLd(s: Settings, socials: string[]) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": siteUrl("/#organization"),
    name: s.siteName,
    url: siteUrl("/"),
    description: s.tagline || undefined,
    email: s.email || undefined,
    telephone: s.phone || undefined,
    logo: s.logo ? siteUrl(s.logo.url) : undefined,
    sameAs: socials.filter((u) => /^https?:/.test(u)),
  };
}

export function websiteLd(s: Settings) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": siteUrl("/#website"),
    url: siteUrl("/"),
    name: s.siteName,
    publisher: { "@id": siteUrl("/#organization") },
    inLanguage: "en",
  };
}

export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: siteUrl(it.path) })),
  };
}

export function serviceLd(o: { name: string; description?: string | null; path: string; offerings: string[]; image?: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: o.name,
    description: o.description ?? undefined,
    url: siteUrl(o.path),
    image: o.image,
    provider: { "@id": siteUrl("/#organization") },
    areaServed: "Worldwide",
    hasOfferCatalog: o.offerings.length
      ? { "@type": "OfferCatalog", name: o.name, itemListElement: o.offerings.map((x) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: x } })) }
      : undefined,
  };
}

export function creativeWorkLd(o: { name: string; description?: string | null; path: string; image?: string; client?: string | null; year?: number | null; genre?: string | null }) {
  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: o.name,
    description: o.description ?? undefined,
    url: siteUrl(o.path),
    image: o.image,
    dateCreated: o.year ? String(o.year) : undefined,
    genre: o.genre ?? undefined,
    creator: { "@id": siteUrl("/#organization") },
    sourceOrganization: o.client ? { "@type": "Organization", name: o.client } : undefined,
  };
}

export function articleLd(o: { title: string; description?: string | null; path: string; image?: string; published?: Date | null; modified?: Date | null; author?: string | null }) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: o.title,
    description: o.description ?? undefined,
    mainEntityOfPage: siteUrl(o.path),
    image: o.image ? [o.image] : undefined,
    datePublished: o.published?.toISOString(),
    dateModified: (o.modified ?? o.published)?.toISOString(),
    author: o.author ? { "@type": "Person", name: o.author } : { "@id": siteUrl("/#organization") },
    publisher: { "@id": siteUrl("/#organization") },
  };
}
