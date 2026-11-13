import Link from "next/link";
import { notFound } from "next/navigation";
import { Media } from "@/components/ui/Media";
import { RichText } from "@/components/ui/RichText";
import { SplitWords } from "@/components/ui/Primitives";
import { BriefCta } from "@/components/sections/lists";
import { sections as REG } from "@/sections/registry";
import { buildMetadata, ogImageUrl } from "@/lib/seo/metadata";
import { JsonLd, articleLd, breadcrumbLd } from "@/lib/seo/jsonld";
import { formatLongDate, formatShortDate } from "@/lib/utils";
import { getAdjacentArticles, getArticle, getSettings } from "@/server/queries";
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
  const [a, settings] = await Promise.all([getArticle(slug, preview), getSettings()]);
  if (!a) return { title: "Not found" };
  return buildMetadata({ settings, title: a.title, seo: a.seo, description: a.excerpt, path: `/newsroom/${slug}`, image: a.coverRef, type: "article", publishedTime: a.publishedAt, noindex: preview });
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const preview = await isPreview();
  const [a, settings] = await Promise.all([getArticle(slug, preview), getSettings()]);
  if (!a) notFound();
  const more = await getAdjacentArticles(a.publishedAt, a.id);
  const path = `/newsroom/${slug}`;
  return (
    <>
      <JsonLd
        data={[
          articleLd({ title: a.title, description: a.excerpt, path, image: ogImageUrl(a.coverRef), published: a.publishedAt, modified: a.updatedAt, author: a.author?.name }),
          breadcrumbLd([
            { name: "Home", path: "/" },
            { name: "Newsroom", path: "/newsroom" },
            { name: a.title, path },
          ]),
        ]}
      />
      <article className="article section--light" data-ground="light">
        <header className="article__head">
          <nav className="article__crumbs t-label" aria-label="Breadcrumb">
            <Link href="/newsroom">Newsroom</Link>
            <span aria-hidden> / </span>
            <time dateTime={a.publishedAt?.toISOString()}>{formatLongDate(a.publishedAt)}</time>
          </nav>
          <h1 className="article__title">
            <SplitWords text={a.title} />
          </h1>
          {a.excerpt && <p className="article-lede__text">{a.excerpt}</p>}
        </header>
        {a.coverRef && (
          <figure className="article-figure article-figure--wide frame" data-reveal="load">
            <Media media={a.coverRef} priority sizes="(min-width: 1200px) 74rem, 100vw" />
          </figure>
        )}
        <div className="article-body">
          <RichText doc={a.body} className="prose article-prose" />
        </div>
        <footer className="article-sign">
          <span className="article-sign__label t-label">Written by</span>
          <span className="article-sign__who">
            <span className="article-sign__name">{a.author?.name ?? settings.siteName}</span>
            {a.services.length > 0 && (
              <span className="article-sign__role">
                Filed under{" "}
                {a.services.map((s, i) => (
                  <span key={s.slug}>
                    {i > 0 && ", "}
                    <Link href={`/expertise/${s.slug}`}>{s.title}</Link>
                  </span>
                ))}
              </span>
            )}
          </span>
        </footer>
      </article>
      {more.length > 0 && (
        <section className="whats-next" data-ground="dark">
          <div className="whats-next__head">
            <h2 className="whats-next__title">Keep reading</h2>
          </div>
          <ul className="next-list">
            {more.map((m) => (
              <li key={m.id}>
                <Link href={`/newsroom/${m.slug}`} className="next-row">
                  <span className="next-row__title">{m.title}</span>
                  <span className="next-row__meta t-label">{formatShortDate(m.publishedAt)}</span>
                  <span className="next-row__arrow" aria-hidden>
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <BriefCta id="article-cta" index={0} data={REG.briefCta.defaults()} media={new Map()} ctx={{ preview, settings, owner: { type: "page", id: a.id, slug: path } }} />
    </>
  );
}
