import { Media } from "@/components/ui/Media";
import { Eyebrow, SplitWords } from "@/components/ui/Primitives";
import type { MediaRef } from "@/lib/media/url";
import { cn } from "@/lib/utils";
import { HeroFilmScene, CinemaHeroScene } from "./scenes/lazy";
import { m, type SectionProps } from "./types";

export function HeroFilm({ data, media }: SectionProps<"heroFilm">) {
  const video = m(media, data.video);
  const image = m(media, data.image);
  const words = data.title.split(/\s+/).filter(Boolean);
  return (
    <HeroFilmScene>
      <div className="hero__stage">
        <div className="hero__frame">
          <div className="hero__film">
            {video ? <Media media={video} poster={image} priority decorative /> : <Media media={image} priority decorative sizes="100vw" />}
          </div>
          <div className="hero__scrim" />
        </div>
        <div className="hero__content">
          <h1 className="hero__title" aria-label={data.title}>
            <span className="split" data-split data-split-manual aria-hidden>
              {words.map((w, i) => (
                <span key={i} className="split__line">
                  <span className="split__mask">
                    <span className="split__word" data-word>
                      {w}
                    </span>
                  </span>
                </span>
              ))}
            </span>
          </h1>
          {data.subtitle && (
            <p className="hero__subtitle">
              <span className="hero__subtitle-inner">{data.subtitle}</span>
            </p>
          )}
        </div>
      </div>
    </HeroFilmScene>
  );
}

/** Shared cinema hero used by the pageHero section and the service / case-study templates. */
export function CinemaHero({
  title,
  eyebrow,
  media,
  poster,
  meta,
}: {
  title: string;
  eyebrow?: string;
  media: MediaRef | null;
  poster?: MediaRef | null;
  meta?: string[];
}) {
  return (
    <CinemaHeroScene hasMedia={!!media}>
      <div className="cinema__frame">
        {media && (
          <div className="cinema__media">
            <Media media={media} poster={poster} priority decorative sizes="100vw" />
          </div>
        )}
        <div className="cinema__scrim" />
      </div>
      <div className={cn("cinema__content", !media && "cinema__content--plain")}>
        {eyebrow && <Eyebrow className="cinema__eyebrow">{eyebrow}</Eyebrow>}
        <h1 className="cinema__title">
          <SplitWords text={title} manual />
        </h1>
        {meta && meta.length > 0 && (
          <p className="cinema__meta t-label">
            {meta.map((x) => (
              <span key={x}>{x}</span>
            ))}
          </p>
        )}
      </div>
    </CinemaHeroScene>
  );
}

export function PageHero({ data, media }: SectionProps<"pageHero">) {
  return <CinemaHero title={data.title} eyebrow={data.eyebrow} media={m(media, data.media)} poster={m(media, data.poster)} />;
}

export function PageIntro({ data }: SectionProps<"pageIntro">) {
  return (
    <section className={cn("page-intro section", data.ground === "light" ? "section--light" : "section--dark")} data-ground={data.ground}>
      <div className="page-intro__inner">
        <Eyebrow>{data.eyebrow}</Eyebrow>
        <h1 className="page-intro__title">
          <SplitWords text={data.title} />
        </h1>
        {data.lead && (
          <p className="page-intro__lead t-lead" data-reveal="load">
            {data.lead}
          </p>
        )}
      </div>
    </section>
  );
}
