import { Media, aspectOf } from "@/components/ui/Media";
import { CircleButton, Eyebrow, SplitWords } from "@/components/ui/Primitives";
import { RichText } from "@/components/ui/RichText";
import { cn, slugify } from "@/lib/utils";
import { listServices } from "@/server/queries";
import { ContactBriefForm } from "./scenes/lazy";
import { m, type SectionProps } from "./types";

export function ContactIntro({ data, ctx }: SectionProps<"contactIntro">) {
  const email = ctx.settings.email;
  return (
    <section className="contact-intro section section--light" data-ground="light">
      <div className="grid12">
        <div className="contact-intro__copy">
          <Eyebrow className="contact-intro__eyebrow">{data.eyebrow}</Eyebrow>
          <h1 className="contact-intro__title">
            <SplitWords text={data.title} />
          </h1>
          {data.lead && (
            <p className="contact-intro__lead t-lead" data-reveal="load">
              {data.lead}
            </p>
          )}
        </div>
      </div>
      <div className="contact-paths grid12">
        <div className="contact-path contact-path--brief" data-reveal>
          <span className="contact-path__label t-label">{data.briefLabel}</span>
          <p className="contact-path__body">{data.briefBody}</p>
          <CircleButton href="#brief" label={data.briefLabel} size={130} />
        </div>
        {email && (
          <div className="contact-path contact-path--email" data-reveal data-reveal-delay="0.08">
            <span className="contact-path__label t-label">{data.emailLabel}</span>
            <a className="contact-path__email" href={`mailto:${email}`}>
              {email}
            </a>
            {data.emailNote && <span className="contact-path__note t-label">{data.emailNote}</span>}
          </div>
        )}
      </div>
    </section>
  );
}

export async function ContactBrief({ data }: SectionProps<"contactBrief">) {
  const services = await listServices();
  return (
    <section className="contact-brief section section--light" data-ground="light">
      <ContactBriefForm
        disciplines={services.map((s) => ({ title: s.title, summary: s.summary, offerings: s.offerings }))}
        budgets={data.budgets}
        timelines={data.timelines}
        stages={data.stages}
        successTitle={data.successTitle}
        successBody={data.successBody}
      />
    </section>
  );
}

export function CaseMedia({ data, media }: SectionProps<"caseMedia">) {
  const mm = m(media, data.media);
  if (!mm) return null;
  const ratio = aspectOf(mm);
  return (
    <section className={cn("case-media", `case-media--${data.layout}`, data.ground === "dark" ? "section--dark" : "section--light")} data-ground={data.ground}>
      <figure className="case-media__figure">
        <div className="case-media__frame frame" style={{ aspectRatio: data.layout === "bleed" ? undefined : String(ratio) }}>
          {data.layout === "bleed" ? (
            <div className="frame__parallax" data-parallax="16">
              <Media media={mm} sizes="100vw" />
            </div>
          ) : (
            <Media media={mm} sizes={data.layout === "portrait" ? "(min-width: 900px) 40vw, 100vw" : "(min-width: 900px) 92vw, 100vw"} fit={data.layout === "contained" ? "contain" : "cover"} />
          )}
        </div>
        {data.caption && <figcaption className="case-caption t-label">{data.caption}</figcaption>}
      </figure>
    </section>
  );
}

export function ImageRow({ data, media }: SectionProps<"imageRow">) {
  const items = data.images.map((i) => ({ ...i, ref: m(media, i.media) })).filter((i) => i.ref);
  if (!items.length) return null;
  return (
    <section className={cn("image-row", data.ground === "dark" ? "section--dark" : "section--light")} data-ground={data.ground}>
      <div className="image-row__items">
        {items.map((it, i) => {
          const r = aspectOf(it.ref);
          return (
            <figure key={i} className="image-row__item" style={{ flexGrow: r, ["--ratio" as string]: r }} data-reveal data-reveal-delay={String(i * 0.08)}>
              <div className="frame" style={{ aspectRatio: String(r) }}>
                <Media media={it.ref} sizes={`(min-width: 900px) ${Math.round(90 / items.length)}vw, 100vw`} />
              </div>
              {it.caption && <figcaption className="case-caption t-label">{it.caption}</figcaption>}
            </figure>
          );
        })}
      </div>
    </section>
  );
}

export function Legal({ data }: SectionProps<"legal">) {
  const sections = data.sections.filter((s) => s.heading);
  return (
    <section className="legal section section--light" data-ground="light">
      <header className="legal__head">
        <h1 className="legal__title">{data.title}</h1>
        {data.intro && <p className="legal__intro t-lead">{data.intro}</p>}
        {data.updated && <p className="legal__updated t-label">{data.updated}</p>}
      </header>
      <div className="legal__layout grid12">
        <nav className="legal__toc" aria-label="On this page">
          <span className="legal__toc-label t-label">Contents</span>
          <ol className="legal__toc-list">
            {sections.map((s) => (
              <li key={s.heading}>
                <a className="legal__toc-link" href={`#${slugify(s.heading)}`}>
                  {s.heading}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <div className="legal__body">
          {sections.map((s) => (
            <section key={s.heading} id={slugify(s.heading)} className="legal-section" tabIndex={-1}>
              <h2 className="legal-section__heading">{s.heading}</h2>
              <RichText doc={s.body} className="prose legal-section__prose" />
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}

