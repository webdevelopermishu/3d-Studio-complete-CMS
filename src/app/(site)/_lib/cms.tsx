import { draftMode } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SectionRenderer } from "@/components/sections/SectionRenderer";
import { buildMetadata } from "@/lib/seo/metadata";
import { JsonLd, breadcrumbLd } from "@/lib/seo/jsonld";
import { getPage, getSettings } from "@/server/queries";

export async function isPreview() {
  return (await draftMode()).isEnabled;
}

export async function cmsPageMetadata(slug: string): Promise<Metadata> {
  const preview = await isPreview();
  const [page, settings] = await Promise.all([getPage(slug, preview), getSettings()]);
  if (!page) return { title: "Not found" };
  return buildMetadata({ settings, title: page.title, seo: page.seo, path: slug ? `/${slug}` : "/", noindex: preview || page.status !== "PUBLISHED" });
}

export async function CmsPage({ slug }: { slug: string }) {
  const preview = await isPreview();
  const [page, settings] = await Promise.all([getPage(slug, preview), getSettings()]);
  if (!page) notFound();
  const crumbs = slug
    ? [{ name: "Home", path: "/" }, ...slug.split("/").map((part, i, arr) => ({ name: i === arr.length - 1 ? page.title : part.replace(/-/g, " "), path: "/" + arr.slice(0, i + 1).join("/") }))]
    : null;
  return (
    <>
      {crumbs && <JsonLd data={breadcrumbLd(crumbs)} />}
      <SectionRenderer sections={page.renderSections} ctx={{ preview, settings, owner: { type: "page", id: page.id, slug } }} />
    </>
  );
}
