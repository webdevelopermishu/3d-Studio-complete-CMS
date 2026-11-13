import Link from "next/link";
import { notFound } from "next/navigation";
import { CinemaHero } from "@/components/sections/hero";
import { SectionRenderer } from "@/components/sections/SectionRenderer";
import { SplitWords } from "@/components/ui/Primitives";
import { buildMetadata, ogImageUrl } from "@/lib/seo/metadata";
import { JsonLd, breadcrumbLd, creativeWorkLd } from "@/lib/seo/jsonld";
import { getProject, getSettings } from "@/server/queries";
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
  const [p, settings] = await Promise.all([getProject(slug, preview), getSettings()]);
  if (!p) return { title: "Not found" };
  return buildMetadata({ settings, title: p.title, seo: p.seo, description: p.summary ?? p.lead, path: `/case-studies/${slug}`, image: p.coverRef, noindex: preview });
}

export default async function CaseStudyPage({ params }: Props) {
  const { slug } = await params;
  const preview = await isPreview();
  const [p, settings] = await Promise.all([getProject(slug, preview), getSettings()]);
  if (!p) notFound();
  const path = `/case-studies/${slug}`;
  const facts = [
    { label: "Client", value: p.client },
    { label: "Discipline", value: p.service?.title, href: p.service ? `/expertise/${p.service.slug}` : undefined },
    { label: "Industry", value: p.industries.map((i) => i.name).join(", ") },
    { label: "Services", value: p.servicesText },
    { label: "Year", value: p.year ? String(p.year) : null },
    { label: "Location", value: p.location },
  ].filter((f) => f.value);

  return (
    <article className="case-study">
      <JsonLd
        data={[
          creativeWorkLd({ name: p.title, description: p.summary ?? p.lead, path, image: ogImageUrl(p.coverRef), client: p.client, year: p.year, genre: p.service?.title }),
          breadcrumbLd([
            { name: "Home", path: "/" },
            { name: "Case studies", path: "/case-studies" },
            { name: p.title, path },
          ]),
        ]}
      />
      <CinemaHero title={p.title} media={p.videoRef ?? p.coverRef} poster={p.coverRef} />
      <section className="case-facts section section--light" data-ground="light">
        <div className="case-facts__rule" />
        <dl className="case-facts__row grid12">
          {facts.map((f) => (
            <div key={f.label} className="case-fact">
              <dt className="case-fact__label t-label">{f.label}</dt>
              <dd className="case-fact__value">{f.href ? <Link href={f.href}>{f.value}</Link> : f.value}</dd>
            </div>
          ))}
        </dl>
      </section>
      {p.lead && (
        <section className="case-open section section--light section--flush-top" data-ground="light">
          <p className="case-open__statement">
            <SplitWords text={p.lead} />
          </p>
        </section>
      )}
      <SectionRenderer sections={p.renderSections} ctx={{ preview, settings, owner: { type: "project", id: p.id, slug } }} />
    </article>
  );
}
