import { Media } from "@/components/ui/Media";
import { Eyebrow, SplitWords } from "@/components/ui/Primitives";
import { RichText } from "@/components/ui/RichText";
import { cn } from "@/lib/utils";
import { VisionScene, MethodScene } from "./scenes/lazy";
import { m, type SectionProps } from "./types";

const groundClass = (g: string) => (g === "light" ? "section--light" : "section--dark");

export function Statement({ data }: SectionProps<"statement">) {
  return (
    <section className="statement" data-ground="dark">
      <h2 className="statement__title">
        <SplitWords text={data.title} scrub />
      </h2>
      {data.body && (
        <div className="statement__foot" data-reveal>
          <span className="statement__rule" />
          <p className="statement__body">{data.body}</p>
        </div>
      )}
    </section>
  );
}

export function StudioIntro({ data }: SectionProps<"studioIntro">) {
  const lines = data.statements.filter(Boolean);
  return (
    <section className="studio-intro" data-ground="dark">
      {lines.map((s, i) => (
        <p key={i} className={cn("studio-intro__statement", i % 2 === 1 && "studio-intro__statement--end")}>
          <SplitWords text={s} />
        </p>
      ))}
    </section>
  );
}

export function Figures({ data }: SectionProps<"figures">) {
  return (
    <section className="figures" data-ground="dark">
      <div className="figures__inner">
        <h2 className="figures__title">
          <SplitWords text={data.title} />
        </h2>
        <div className="figures__rule" />
        <dl className="figures__row">
          {data.items.map((it, i) => {
            const n = Number(String(it.value).replace(/[^0-9.]/g, ""));
            return (
              <div className="figures__item" key={i} data-reveal data-reveal-delay={String(i * 0.08)}>
                <dt className="figures__value">
                  <span className="visually-hidden">{`${it.prefix}${it.value}${it.suffix}`}</span>
                  <span aria-hidden className="figures__num">
                    {it.prefix}
                    <span className="figures__digits">
                      <span className="figures__digits-size">{it.value}</span>
                      <span className="figures__digits-live" data-count={Number.isFinite(n) ? n : undefined}>
                        {it.value}
                      </span>
                    </span>
                    {it.suffix}
                  </span>
                </dt>
                <dd className="figures__label t-label">
                  {it.label}
                  {it.note && <span className="figures__note">{it.note}</span>}
                </dd>
              </div>
            );
          })}
        </dl>
      </div>
    </section>
  );
}

export function Chapter({ data, media }: SectionProps<"chapter">) {
  const mm = m(media, data.media);
  return (
    <section className={cn("chapter section", groundClass(data.ground))} data-ground={data.ground}>
      <div className="grid12 chapter__grid">
        <h2 className="chapter__heading">
          <SplitWords text={data.heading} />
        </h2>
        <div className="chapter__copy">
          {data.lead && (
            <p className="chapter__lead" data-reveal>
              {data.lead}
            </p>
          )}
          <div data-reveal>
            <RichText doc={data.body} className="prose chapter__body" />
          </div>
        </div>
      </div>
      {mm && (
        <div className="chapter__media frame" data-reveal>
          <Media media={mm} sizes="(min-width: 900px) 92vw, 100vw" />
        </div>
      )}
    </section>
  );
}

export function ServicesList({ data, ctx }: SectionProps<"servicesList">) {
  const items = data.items.filter(Boolean).length ? data.items.filter(Boolean) : ctx.owner.type === "service" ? ctx.owner.offerings : [];
  if (!items.length) return null;
  return (
    <section className={cn("chapter section section--flush-top", groundClass(data.ground))} data-ground={data.ground}>
      <div className="grid12 chapter__grid">
        <h2 className="chapter__heading">
          <SplitWords text={data.heading} />
        </h2>
        <ul className="caps">
          {items.map((it, i) => (
            <li key={i} className="caps__item" data-reveal data-reveal-delay={String((i % 2) * 0.06)}>
              {it}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function Editorial({ data, media }: SectionProps<"editorial">) {
  const a = m(media, data.imageA);
  const b = m(media, data.imageB);
  return (
    <section className={cn("editorial section", groundClass(data.ground))} data-ground={data.ground}>
      {data.text && (
        <p className="editorial__text">
          <SplitWords text={data.text} />
        </p>
      )}
      {data.note && (
        <p className="editorial__note" data-reveal>
          {data.note}
        </p>
      )}
      {(a || b) && (
        <div className="editorial__pair">
          {[a, b].filter(Boolean).map((x, i) => (
            <div key={i} className="frame frame--portrait" data-reveal data-reveal-delay={String(i * 0.1)}>
              <div className="frame__parallax" data-parallax="10">
                <Media media={x} sizes="(min-width: 900px) 45vw, 100vw" />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function Vision({ data, media }: SectionProps<"vision">) {
  const film = m(media, data.media);
  const lines = data.statements.filter(Boolean);
  return (
    <VisionScene count={lines.length}>
      <div className="vision__film">
        <Media media={film} poster={m(media, data.poster)} decorative sizes="100vw" />
        <div className="vision__scrim" />
      </div>
      <div className="vision__statements">
        {lines.map((s, i) => (
          <p key={i} className={cn("vision__statement", `vision__statement--${i + 1}`)}>
            {s}
          </p>
        ))}
      </div>
    </VisionScene>
  );
}

export function Method({ data }: SectionProps<"method">) {
  const steps = data.steps.filter((s) => s.title);
  return (
    <MethodScene steps={steps.length}>
      <div className="method__head">
        <Eyebrow className="method__eyebrow">{data.eyebrow}</Eyebrow>
        <h2 className="method__title">{data.title}</h2>
        {data.intro && <p className="method__intro">{data.intro}</p>}
      </div>
      <div className="method__rail">
        <ol className="method__steps">
          {steps.map((s, i) => (
            <li key={i} className="method__step">
              <span className="method__index t-label">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="method__step-title">{s.title}</h3>
              <p className="method__body">{s.body}</p>
            </li>
          ))}
        </ol>
        <span className="method__rule">
          <span className="method__rule-fill" />
        </span>
      </div>
    </MethodScene>
  );
}

export function CaseChapter({ data }: SectionProps<"caseChapter">) {
  return (
    <section className={cn("case-chapter section", groundClass(data.ground))} data-ground={data.ground}>
      <div className="grid12">
        <h2 className="case-chapter__heading">
          <SplitWords text={data.heading} />
        </h2>
        <div className="case-chapter__body" data-reveal>
          <RichText doc={data.body} />
        </div>
      </div>
    </section>
  );
}

export function RichTextSection({ data }: SectionProps<"richText">) {
  return (
    <section className={cn("rich section", groundClass(data.ground))} data-ground={data.ground}>
      <div className="grid12">
        {data.heading && <h2 className="rich__heading">{data.heading}</h2>}
        <div className="rich__body" data-reveal>
          <RichText doc={data.body} />
        </div>
      </div>
    </section>
  );
}
