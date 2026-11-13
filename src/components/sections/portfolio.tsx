import Link from "next/link";
import { Media } from "@/components/ui/Media";
import { ArrowLink, SplitWords } from "@/components/ui/Primitives";
import { imageUrl, srcSet, videoPosterUrl, videoUrl } from "@/lib/media/url";
import { getTaxonomies, listProjects, listServices } from "@/server/queries";
import { DisciplineScene, CaseReelScene, WorkWall as WorkWallClient, CaseIndex as CaseIndexClient } from "./scenes/lazy";
import type { WallTile } from "./scenes/WorkWall";
import type { SectionProps } from "./types";

export async function DisciplineSceneSection({ data }: SectionProps<"disciplineScene">) {
  const services = await listServices(data.services);
  if (!services.length) return null;
  return (
    <DisciplineScene count={services.length}>
      <div className="xp__head">
        <h2 className="xp__title">{data.title}</h2>
      </div>
      {services.map((s, i) => (
        <article key={s.id} className="xp-panel" aria-labelledby={`xp-${s.id}`}>
          <div className="xp-panel__media">
            <Media media={s.cover} sizes="100vw" decorative priority={i === 0} />
          </div>
          <div className="xp-panel__scrim" />
          <div className="xp-panel__content">
            <h3 className="xp-panel__title" id={`xp-${s.id}`}>
              <Link href={`/expertise/${s.slug}`} className="xp-panel__link" data-cursor-label={data.linkLabel || "Explore"}>
                {s.title}
              </Link>
            </h3>
            {s.tagline && <p className="xp-panel__body">{s.tagline}</p>}
          </div>
        </article>
      ))}
      <ol className="xp-track" aria-label="Disciplines">
        {services.map((s, i) => (
          <li key={s.id}>
            <button type="button" className="xp-track__tab" aria-label={`Show ${s.title}`}>
              <span className="xp-track__label t-label">
                {String(i + 1).padStart(2, "0")} {s.title}
              </span>
              <span className="xp-track__line">
                <span className="xp-track__fill" />
              </span>
            </button>
          </li>
        ))}
      </ol>
    </DisciplineScene>
  );
}

export async function DisciplinesStrip({ data }: SectionProps<"disciplinesStrip">) {
  const services = await listServices(data.services);
  return (
    <section className="disciplines" data-ground="dark">
      <h2 className="disciplines__title">
        <SplitWords text={data.title} />
      </h2>
      <ul className="disciplines__strip">
        {services.map((s) => (
          <li key={s.id} className="discipline">
            <Link href={`/expertise/${s.slug}`} className="discipline__link">
              <span className="discipline__media">
                <Media media={s.cover} sizes="(min-width: 1024px) 52vw, 70vw" decorative />
              </span>
              <span className="discipline__scrim" />
              <span className="discipline__edge" aria-hidden>
                {s.title}
              </span>
              <span className="discipline__copy">
                <span className="discipline__name">{s.title}</span>
                {s.tagline && <span className="discipline__desc">{s.tagline}</span>}
                <span className="discipline__more t-label">Explore →</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export async function DisciplineRows({ data }: SectionProps<"disciplineRows">) {
  const services = await listServices(data.services);
  return (
    <section className="xp-rows" data-ground="dark">
      {services.map((s, i) => (
        <article key={s.id} className="xp-row" data-flip={i % 2 === 1}>
          <Link href={`/expertise/${s.slug}`} className="xp-row__media frame" tabIndex={-1} aria-hidden data-cursor-label={data.linkLabel || "Explore"}>
            <span className="frame__parallax" data-parallax="10">
              <Media media={s.cover} sizes="(min-width: 900px) 58vw, 100vw" decorative />
            </span>
          </Link>
          <div className="xp-row__copy" data-reveal>
            <span className="t-label xp-row__index">{String(i + 1).padStart(2, "0")}</span>
            <h2 className="xp-row__title">
              <Link href={`/expertise/${s.slug}`}>{s.title}</Link>
            </h2>
            {s.summary && <p className="xp-row__body">{s.summary}</p>}
            <ArrowLink href={`/expertise/${s.slug}`} label={data.linkLabel || "Explore"} />
          </div>
        </article>
      ))}
    </section>
  );
}

export async function CaseReel({ data }: SectionProps<"caseReel">) {
  let projects = await listProjects({ ids: data.projects, caseStudies: true });
  if (!data.projects.length) projects = await listProjects({ caseStudies: true, featured: true, limit: 6 });
  if (!projects.length) projects = await listProjects({ caseStudies: true, limit: 6 });
  return (
    <CaseReelScene>
      <div className="reel__viewport">
        <div className="reel__track">
          <div className="reel-panel reel-panel--word">
            <div className="reel-word">
              <h2 className="reel-word__title">{data.title}</h2>
              {data.link.href && <ArrowLink href={data.link.href} label={data.link.label} />}
            </div>
          </div>
          {projects.map((p) => (
            <article key={p.id} className="reel-panel reel-panel--case">
              <Link href={`/case-studies/${p.slug}`} className="reel-card" data-cursor-label="View">
                <span className="reel-card__media">
                  <Media media={p.video ?? p.cover} poster={p.cover} sizes="(min-width: 1024px) 46vw, 80vw" decorative />
                  <span className="reel-card__scrim" />
                </span>
                <span className="reel-card__copy">
                  <span className="reel-card__title">{p.title}</span>
                  {p.summary && <span className="reel-card__summary">{p.summary}</span>}
                </span>
              </Link>
            </article>
          ))}
          {data.closingTitle && (
            <div className="reel-panel reel-panel--word reel-panel--close">
              <div className="reel-word">
                <p className="reel-word__title">{data.closingTitle}</p>
                {data.link.href && <ArrowLink href={data.link.href} label={data.link.label} />}
              </div>
            </div>
          )}
        </div>
      </div>
    </CaseReelScene>
  );
}

export async function WorkWallSection({ data }: SectionProps<"workWall">) {
  const [projects, tax] = await Promise.all([listProjects({ wall: true }), getTaxonomies()]);
  const tiles: WallTile[] = projects
    .filter((p) => p.cover || p.video)
    .map((p) => {
      const img = p.cover ?? p.video?.poster ?? null;
      const posterUrl = p.video ? videoPosterUrl(p.video) : undefined;
      return {
        id: p.id,
        title: p.title,
        client: p.client,
        alt: img?.alt || p.title,
        aspect: p.wallAspect,
        src: img ? imageUrl(img.url, 828) : posterUrl ?? "",
        srcSet: img ? srcSet(img.url) : undefined,
        full: img ? imageUrl(img.url, 2560, 82) : posterUrl ?? "",
        blur: img?.blurDataUrl ?? null,
        width: img?.width ?? null,
        height: img?.height ?? null,
        video: p.video ? videoUrl(p.video) : null,
        caseHref: p.isCaseStudy ? `/case-studies/${p.slug}` : null,
        serviceTitle: p.service?.title ?? null,
        categories: p.categories.map((c) => c.slug),
        deliverables: p.deliverables.map((c) => c.slug),
        industries: p.industries.map((c) => c.slug),
      };
    });
  const facets = [
    { key: "service" as const, label: "Service", options: tax.categories.map((c) => ({ slug: c.slug, name: c.name })) },
    { key: "deliverable" as const, label: "Deliverable", options: tax.deliverables.map((c) => ({ slug: c.slug, name: c.name })) },
    { key: "industry" as const, label: "Industry", options: tax.industries.map((c) => ({ slug: c.slug, name: c.name })) },
  ];
  return <WorkWallClient tiles={tiles} facets={facets} title={data.title} eyebrow={data.eyebrow} showFilters={data.showFilters} />;
}

export async function CaseIndexSection({ data }: SectionProps<"caseIndex">) {
  const [projects, services] = await Promise.all([listProjects({ caseStudies: true }), listServices()]);
  const items = projects.map((p) => ({
    id: p.id,
    title: p.title,
    href: `/case-studies/${p.slug}`,
    discipline: p.service?.title ?? null,
    disciplineSlug: p.service?.slug ?? null,
    image: p.cover ? imageUrl(p.cover.url, 1920) : null,
    video: p.video ? videoUrl(p.video) : null,
  }));
  return <CaseIndexClient items={items} title={data.title} filters={services.map((s) => ({ slug: s.slug, name: s.title }))} />;
}
