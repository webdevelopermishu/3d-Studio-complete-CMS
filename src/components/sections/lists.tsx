import Link from "next/link";
import { Media } from "@/components/ui/Media";
import { ArrowLink, CircleButton, Eyebrow, SmartLink, SplitWords } from "@/components/ui/Primitives";
import { imageUrl, videoUrl, type MediaRef } from "@/lib/media/url";
import { cn, formatShortDate } from "@/lib/utils";
import { listArticles, listProjects, listServices } from "@/server/queries";
import { HoverPreviewList } from "./scenes/lazy";
import type { PreviewItem } from "./scenes/HoverPreviewList";
import { m, type SectionProps } from "./types";

const previewOf = (cover: MediaRef | null, video?: MediaRef | null) => ({
  image: cover ? imageUrl(cover.url, 1080) : null,
  video: video ? videoUrl(video) : null,
});

export async function KeepExploring({ data, ctx }: SectionProps<"keepExploring">) {
  let items: PreviewItem[] = [];
  if (data.mode === "services") {
    const services = await listServices();
    items = services
      .filter((s) => !(ctx.owner.type === "service" && ctx.owner.id === s.id))
      .map((s) => ({ href: `/expertise/${s.slug}`, title: s.title, ...previewOf(s.cover) }));
  } else {
    const projects = await listProjects({ ids: data.projects, caseStudies: true });
    items = projects
      .filter((p) => !(ctx.owner.type === "project" && ctx.owner.id === p.id))
      .map((p) => ({ href: `/case-studies/${p.slug}`, title: p.title, meta: p.service?.title, ...previewOf(p.cover, p.video) }));
  }
  if (!items.length) return null;
  return (
    <section className="whats-next" data-ground="dark">
      <div className="whats-next__head">
        <h2 className="whats-next__title">{data.title}</h2>
      </div>
      <HoverPreviewList items={items} label={data.title} />
      {data.allLink.href && (
        <div className="whats-next__all">
          <CircleButton href={data.allLink.href} label={data.allLink.label || "See all"} />
        </div>
      )}
    </section>
  );
}

export async function CaseInsights({ data }: SectionProps<"caseInsights">) {
  const [projects, articles] = await Promise.all([
    data.projects.length ? listProjects({ ids: data.projects, caseStudies: true }) : Promise.resolve([]),
    data.articles.length ? listArticles({ ids: data.articles }) : Promise.resolve([]),
  ]);
  const items: PreviewItem[] = [
    ...projects.map((p) => ({ href: `/case-studies/${p.slug}`, title: p.title, meta: "Case study", ...previewOf(p.cover, p.video) })),
    ...articles.map((a) => ({ href: `/newsroom/${a.slug}`, title: a.title, meta: "Article", ...previewOf(a.cover) })),
  ];
  if (!items.length) return null;
  return (
    <section className="whats-next" data-ground="dark">
      <div className="whats-next__head">
        <h2 className="whats-next__title">{data.title}</h2>
      </div>
      <HoverPreviewList items={items} label={data.title} />
      {data.allLink.href && (
        <div className="whats-next__all">
          <CircleButton href={data.allLink.href} label={data.allLink.label || "See all"} />
        </div>
      )}
    </section>
  );
}

export async function NewsStrip({ data }: SectionProps<"newsStrip">) {
  const articles = data.articles.length ? await listArticles({ ids: data.articles }) : await listArticles({ limit: data.count });
  if (!articles.length) return null;
  return (
    <section className="news-scene" data-ground="dark">
      <div className="news-scene__head">
        <h2 className="news-scene__heading">{data.title}</h2>
        {data.link.href && <ArrowLink href={data.link.href} label={data.link.label} className="news-scene__all" />}
      </div>
      <ul className="news-strip">
        {articles.map((a) => (
          <li key={a.id} className="news-panel">
            <Link href={`/newsroom/${a.slug}`} className="news-panel__link">
              <span className="news-panel__media">
                <Media media={a.cover} sizes="(min-width: 1024px) 52vw, 70vw" decorative />
              </span>
              <span className="news-panel__scrim" />
              <span className="news-panel__index t-label" aria-hidden>
                {formatShortDate(a.publishedAt)}
              </span>
              <span className="news-panel__copy">
                <span className="news-panel__meta t-label">{formatShortDate(a.publishedAt)}</span>
                <span className="news-panel__title">{a.title}</span>
                {a.excerpt && <span className="news-panel__excerpt">{a.excerpt}</span>}
                <span className="news-panel__more t-label">Read →</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export async function ArticleList({ data }: SectionProps<"articleList">) {
  const articles = await listArticles();
  return (
    <section className="newsroom section--light" data-ground="light">
      <div className="newsroom__intro">
        <h1 className="newsroom__title">
          <SplitWords text={data.title} />
        </h1>
        {data.lead && (
          <p className="newsroom__lead" data-reveal="load">
            {data.lead}
          </p>
        )}
      </div>
      {articles.length === 0 ? (
        <p className="newsroom__empty">New articles are on the way.</p>
      ) : (
        <ul className="newsroom__grid">
          {articles.map((a, i) => (
            <li key={a.id} className="news-card" data-reveal={i < 4 ? "load" : ""} data-reveal-delay={String((i % 4) * 0.06)} style={{ ["--reveal-delay" as string]: (i % 4) * 0.06 }}>
              <Link href={`/newsroom/${a.slug}`} className="news-card__link" data-cursor-label="Read">
                <span className="news-card__media frame">
                  <Media media={a.cover} sizes="(min-width: 1100px) 22vw, (min-width: 640px) 45vw, 90vw" decorative priority={i < 2} />
                </span>
                <time className="news-card__date" dateTime={a.publishedAt?.toISOString()}>
                  {formatShortDate(a.publishedAt)}
                </time>
                <span className="news-card__title">{a.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function ClientWall({ data, media }: SectionProps<"clientWall">) {
  const logos = data.logos.filter((l) => l.logo && media.get(l.logo));
  const rows = Math.max(1, Math.min(4, data.rows));
  const perRow = Math.ceil(logos.length / rows) || 1;
  const chunks = Array.from({ length: rows }, (_, i) => logos.slice(i * perRow, (i + 1) * perRow)).filter((c) => c.length);
  return (
    <section className="clients" data-ground="dark">
      <div className="clients__head">
        <Eyebrow className="clients__eyebrow">{data.eyebrow}</Eyebrow>
        <h2 className="clients__title">
          <SplitWords text={data.title} />
        </h2>
        {data.body && <p className="clients__body">{data.body}</p>}
      </div>
      <div className="client-wall__rows">
        {chunks.map((row, ri) => (
          <div className="client-wall__row" key={ri}>
            <ul className={cn("client-wall__track", ri % 2 === 1 && "client-wall__track--reverse")} style={{ ["--n" as string]: row.length }}>
              {[...row, ...row].map((l, i) => {
                const logo = m(media, l.logo)!;
                return (
                  <li key={i} className="client-wall__card" aria-hidden={i >= row.length || undefined}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      className="client-wall__logo"
                      src={imageUrl(logo.url, 384)}
                      width={logo.width ?? undefined}
                      height={logo.height ?? undefined}
                      alt={i < row.length ? l.name || logo.alt : ""}
                      loading="lazy"
                      decoding="async"
                    />
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

export function FeaturePanel({ data, media }: SectionProps<"featurePanel">) {
  return (
    <section className="signature" data-ground="dark">
      <div className="signature__media">
        <div className="signature__parallax" data-parallax="14">
          <Media media={m(media, data.media)} sizes="100vw" decorative />
        </div>
      </div>
      <div className="signature__scrim" />
      {data.link.href && <SmartLink href={data.link.href} className="signature__link" aria-label={data.link.label || data.title} tabIndex={-1} data-cursor-label="Open" />}
      <div className="signature__content">
        <Eyebrow className="signature__eyebrow">{data.eyebrow}</Eyebrow>
        <h2 className="signature__title">{data.title}</h2>
        {data.body && <p className="signature__body">{data.body}</p>}
        {data.link.href && (
          <div className="signature__action">
            <CircleButton href={data.link.href} label={data.link.label || "Open"} />
          </div>
        )}
      </div>
    </section>
  );
}

export function Gateway({ data, media }: SectionProps<"gateway">) {
  return (
    <section className="gateway" data-ground="dark">
      <div className="gateway__panel" data-reveal>
        <div className="gateway__media">
          <div className="gateway__parallax" data-parallax="14">
            <Media media={m(media, data.media)} sizes="(min-width: 900px) 92vw, 100vw" decorative />
          </div>
        </div>
        <div className="gateway__scrim" />
        {data.link.href && <SmartLink href={data.link.href} className="gateway__link" tabIndex={-1} aria-hidden data-cursor-label="View" />}
        <div className="gateway__content">
          <h2 className="gateway__title">{data.title}</h2>
          {data.body && <p className="gateway__body">{data.body}</p>}
          {data.link.href && (
            <div className="gateway__action">
              <CircleButton href={data.link.href} label={data.link.label || "View"} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export function BriefCta({ data, ctx }: SectionProps<"briefCta">) {
  return (
    <section className="contact-scene" data-ground="dark">
      <Eyebrow className="contact-scene__eyebrow">{data.eyebrow}</Eyebrow>
      <h2 className="contact-scene__title">
        <SplitWords text={data.title} />
      </h2>
      {data.body && (
        <p className="contact-scene__body t-lead" data-reveal>
          {data.body}
        </p>
      )}
      <div className="contact-scene__action" data-reveal>
        {data.link.href && <CircleButton href={data.link.href} label={data.link.label || "Contact"} />}
        {data.showEmail && ctx.settings.email && (
          <a className="contact-scene__email t-label" href={`mailto:${ctx.settings.email}`}>
            {ctx.settings.email}
          </a>
        )}
      </div>
    </section>
  );
}
