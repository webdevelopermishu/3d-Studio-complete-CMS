"use client";
import { LazyVideo } from "@/components/ui/LazyVideo";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export type WallTile = {
  id: string;
  title: string;
  client: string | null;
  alt: string;
  aspect: string;
  src: string;
  srcSet?: string;
  full: string;
  blur: string | null;
  width: number | null;
  height: number | null;
  video: string | null;
  caseHref: string | null;
  serviceTitle: string | null;
  categories: string[];
  deliverables: string[];
  industries: string[];
};
type Facet = { key: "service" | "deliverable" | "industry"; label: string; options: { slug: string; name: string }[] };

const FIELD: Record<Facet["key"], keyof Pick<WallTile, "categories" | "deliverables" | "industries">> = {
  service: "categories",
  deliverable: "deliverables",
  industry: "industries",
};

/** Masonry wall with three single-select filter groups (URL-synced) and an accessible lightbox. */
export function WorkWall({ tiles, facets, title, eyebrow, showFilters }: { tiles: WallTile[]; facets: Facet[]; title: string; eyebrow: string; showFilters: boolean }) {
  const [sel, setSel] = useState<Record<string, string>>({});
  const [open, setOpen] = useState<number | null>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const init: Record<string, string> = {};
    for (const f of facets) {
      const v = q.get(f.key);
      if (v && f.options.some((o) => o.slug === v)) init[f.key] = v;
    }
    setSel(init);
  }, [facets]);

  const choose = (key: string, slug: string | null) => {
    setSel((s) => {
      const next = { ...s };
      if (slug) next[key] = slug;
      else delete next[key];
      const q = new URLSearchParams(next);
      const url = window.location.pathname + (q.toString() ? `?${q}` : "");
      window.history.replaceState(null, "", url);
      return next;
    });
  };

  const visible = useMemo(
    () => tiles.filter((t) => facets.every((f) => !sel[f.key] || t[FIELD[f.key]].includes(sel[f.key]))),
    [tiles, facets, sel],
  );
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const f of facets)
      for (const o of f.options)
        c[`${f.key}:${o.slug}`] = tiles.filter(
          (t) => t[FIELD[f.key]].includes(o.slug) && facets.every((g) => g.key === f.key || !sel[g.key] || t[FIELD[g.key]].includes(sel[g.key])),
        ).length;
    return c;
  }, [tiles, facets, sel]);

  const close = useCallback(() => {
    setOpen(null);
    lastFocus.current?.focus();
  }, []);
  const step = useCallback((d: number) => setOpen((i) => (i === null ? i : (i + d + visible.length) % visible.length)), [visible.length]);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    dialog.current?.querySelector<HTMLElement>(".lightbox__close")?.focus();
    const lenis = (window as unknown as { __lenis?: { stop: () => void; start: () => void } }).__lenis;
    lenis?.stop();
    document.documentElement.classList.add("lightbox-open");
    return () => {
      window.removeEventListener("keydown", onKey);
      lenis?.start();
      document.documentElement.classList.remove("lightbox-open");
    };
  }, [open, close, step]);

  const cur = open !== null ? visible[open] : null;

  return (
    <section className="work" data-ground="dark">
      <aside className="work__rail">
        <p className="t-label work__eyebrow">{eyebrow}</p>
        <h1 className="work__title">{title}</h1>
        {showFilters &&
          facets.map((f) => (
            <div className="work-filter" key={f.key} role="group" aria-label={`Filter by ${f.label}`}>
              <span className="work-filter__label t-label">{f.label}</span>
              <ul className="work-filter__list">
                <li>
                  <button type="button" className="work-filter__btn t-label" aria-pressed={!sel[f.key]} onClick={() => choose(f.key, null)}>
                    All
                  </button>
                </li>
                {f.options.map((o) => (
                  <li key={o.slug}>
                    <button
                      type="button"
                      className="work-filter__btn t-label"
                      aria-pressed={sel[f.key] === o.slug}
                      disabled={!counts[`${f.key}:${o.slug}`] && sel[f.key] !== o.slug}
                      onClick={() => choose(f.key, sel[f.key] === o.slug ? null : o.slug)}
                    >
                      {o.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        <p className="work__count t-label" aria-live="polite">
          {visible.length} {visible.length === 1 ? "image" : "images"}
        </p>
      </aside>

      <div className="work-wall">
        {visible.length === 0 && <p className="work-wall__empty">Nothing matches these filters yet.</p>}
        {visible.map((t, i) => (
          <button
            key={t.id}
            type="button"
            className="work-tile"
            data-aspect={t.aspect}
            data-cursor-label="View"
            aria-label={`Open ${t.alt}`}
            onClick={(e) => {
              lastFocus.current = e.currentTarget;
              setOpen(i);
            }}
          >
            {t.video ? (
              <>
                {/* The still is a real image so it loads early (posters are fetched late); the video
                    covers it once playing. It loads only near the viewport and pauses off-screen. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="media" src={t.src} alt="" loading={i < 6 ? "eager" : "lazy"} fetchPriority={i < 2 ? "high" : undefined} decoding="async" />
                <LazyVideo className="media" src={t.video} poster={t.src} eager={i < 2} />
              </>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="media"
                src={t.src}
                srcSet={t.srcSet}
                sizes="(min-width: 1200px) 27vw, (min-width: 640px) 45vw, 100vw"
                alt=""
                loading={i < 6 ? "eager" : "lazy"}
                fetchPriority={i < 2 ? "high" : undefined}
                decoding="async"
                style={{ backgroundImage: t.blur ? `url(${t.blur})` : undefined, backgroundSize: "cover" }}
              />
            )}
            {t.video && (
              <span className="work-tile__badge t-label" aria-hidden>
                ▶
              </span>
            )}
          </button>
        ))}
      </div>

      {cur && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={cur.alt} ref={dialog}>
          <button type="button" className="lightbox__backdrop" aria-label="Close" tabIndex={-1} onClick={close} />
          <button type="button" className="lightbox__close t-label" onClick={close}>
            Close <span aria-hidden>✕</span>
          </button>
          {visible.length > 1 && (
            <>
              <button type="button" className="lightbox__nav lightbox__nav--prev" onClick={() => step(-1)} aria-label="Previous image">
                ←
              </button>
              <button type="button" className="lightbox__nav lightbox__nav--next" onClick={() => step(1)} aria-label="Next image">
                →
              </button>
            </>
          )}
          <figure className="lightbox__figure">
            <div className="lightbox__media" data-aspect={cur.aspect}>
              {cur.video ? (
                <video className="lightbox__video" src={cur.video} poster={cur.full} controls autoPlay muted loop playsInline />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="lightbox__img" src={cur.full} alt={cur.alt} />
              )}
            </div>
            <figcaption className="lightbox__caption t-label">
              <span>
                {cur.client ?? cur.title}
                {cur.serviceTitle ? ` · ${cur.serviceTitle}` : ""}
              </span>
              <span className="lightbox__count">
                {String((open ?? 0) + 1).padStart(2, "0")} / {String(visible.length).padStart(2, "0")}
              </span>
              {cur.caseHref && (
                <Link href={cur.caseHref} className={cn("lightbox__case")} data-no-transition onClick={() => setOpen(null)}>
                  View case study →
                </Link>
              )}
            </figcaption>
          </figure>
        </div>
      )}
    </section>
  );
}
