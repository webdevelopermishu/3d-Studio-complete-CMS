import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/utils";

export default function robots(): MetadataRoute.Robots {
  // Non-production deployments (previews/staging) are never indexed.
  const indexable = process.env.ALLOW_INDEXING !== "false" && process.env.VERCEL_ENV !== "preview";
  return {
    rules: indexable ? [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] }] : [{ userAgent: "*", disallow: "/" }],
    sitemap: siteUrl("/sitemap.xml"),
    host: siteUrl("/"),
  };
}
