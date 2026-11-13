import { notFound } from "next/navigation";
import { CinemaHero } from "@/components/sections/hero";
import { SectionRenderer } from "@/components/sections/SectionRenderer";
import { buildMetadata, ogImageUrl } from "@/lib/seo/metadata";
import { JsonLd, breadcrumbLd, serviceLd } from "@/lib/seo/jsonld";
import { getService, getSettings } from "@/server/queries";
import { isPreview } from "../../_lib/cms";

export const revalidate = 3600;
export const dynamicParams = true;
/** Rendered on first request, then cached (ISR) and purged on CMS changes. */
export async function generateStaticParams() {
  return [];
}
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const preview = await isPreview();
  const [s, settings] = await Promise.all([getService(slug, preview), getSettings()]);
  if (!s) return { title: "Not found" };
  return buildMetadata({ settings, title: s.title, seo: s.seo, description: s.summary, path: `/expertise/${slug}`, image: s.coverRef, noindex: preview });
}

export default async function ServicePage({ params }: Props) {
  const { slug } = await params;
  const preview = await isPreview();
  const [s, settings] = await Promise.all([getService(slug, preview), getSettings()]);
  if (!s) notFound();
  const path = `/expertise/${slug}`;
  return (
    <>
      <JsonLd
        data={[
          serviceLd({ name: s.title, description: s.summary, path, offerings: s.offerings, image: ogImageUrl(s.coverRef) }),
          breadcrumbLd([
            { name: "Home", path: "/" },
            { name: "Expertise", path: "/expertise" },
            { name: s.title, path },
          ]),
        ]}
      />
      <CinemaHero title={s.title} media={s.coverRef} />
      <SectionRenderer sections={s.renderSections} ctx={{ preview, settings, owner: { type: "service", id: s.id, slug, offerings: s.offerings } }} />
    </>
  );
}
