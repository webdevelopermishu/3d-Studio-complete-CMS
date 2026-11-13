"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type CaseItem = {
  id: string;
  title: string;
  href: string;
  discipline: string | null;
  disciplineSlug: string | null;
  image: string | null;
  video: string | null;
};

/**
 * Case-study wheel: a sticky full-screen stage where scrolling moves a column of giant titles;
 * the centred title is current. Hover/focus switches the stage to a full-bleed preview.
 */
export function CaseIndex({ items, title, filters }: { items: CaseItem[]; title: string; filters: { slug: string; name: string }[] }) {
  const [filter, setFilter] = useState<string | null>(null);
  const [current, setCurrent] = useState(0);
  const [preview, setPreview] = useState<number | null>(null);
  const [switching, setSwitching] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const list = useMemo(() => items.filter((i) => !filter || i.disciplineSlug === filter), [items, filter]);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const el = wrap.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const total = el.offsetHeight - window.innerHeight;
        const p = Math.min(1, Math.max(0, -r.top / Math.max(1, total)));
        const pos = p * Math.max(0, list.length - 1);
        el.style.setProperty("--pos", String(pos));
        setCurrent(Math.round(pos));
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [list.length]);

  const pick = (slug: string | null) => {
    setSwitching(true);
    setTimeout(() => {
      setFilter(slug);
      setPreview(null);
      setSwitching(false);
      wrap.current?.scrollIntoView({ behavior: "instant" as ScrollBehavior, block: "start" });
    }, 260);
  };

  const shown = preview ?? current;
  return (
    <section
      ref={wrap}
      className="cases"
      data-ground={preview !== null ? "dark" : "light"}
      data-preview={preview !== null}
      data-switching={switching}
      style={{ height: `calc(100svh + ${Math.max(0, list.length - 1)} * var(--row-h) * 1.6)` }}
    >
      <h1 className="visually-hidden">{title}</h1>
      <div className="cases__stage">
        <div className="cases__media" aria-hidden>
          {list.map((it, i) => (
            <div key={it.id} className="cases__layer" data-active={preview === i}>
              {it.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.image} alt="" loading="lazy" />
              )}
              {it.video && preview === i && <video src={it.video} muted loop playsInline autoPlay />}
            </div>
          ))}
          <div className="cases__shade" />
        </div>
        <div className="cases__layout">
          <div className="cases__filters" role="group" aria-label="Filter case studies by discipline">
            <ul className="cases__filter-list">
              <li>
                <button type="button" className="cases__filter t-label" aria-pressed={filter === null} onClick={() => pick(null)}>
                  <span>All</span> <span className="cases__filter-count">({items.length})</span>
                  <span className="cases__filter-mark" />
                </button>
              </li>
              {filters.map((f) => {
                const n = items.filter((i) => i.disciplineSlug === f.slug).length;
                return (
                  <li key={f.slug}>
                    <button type="button" className="cases__filter t-label" aria-pressed={filter === f.slug} disabled={n === 0} onClick={() => pick(f.slug)}>
                      <span>{f.name}</span> <span className="cases__filter-count">({n})</span>
                      <span className="cases__filter-mark" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
          <ol className="cases__list">
            {list.map((it, i) => (
              <li key={it.id} className="cases__row" style={{ ["--i" as string]: i }} data-current={i === shown}>
                <Link
                  href={it.href}
                  className="cases__link"
                  onPointerEnter={() => setPreview(i)}
                  onPointerLeave={() => setPreview(null)}
                  onFocus={() => setPreview(i)}
                  onBlur={() => setPreview(null)}
                  data-cursor-label="Open"
                >
                  <span className="cases__title">{it.title}</span>
                  {it.discipline && <span className="cases__meta t-label">{it.discipline}</span>}
                </Link>
              </li>
            ))}
          </ol>
        </div>
        <p className={cn("cases__count t-label")} aria-hidden>
          {String(Math.min(shown + 1, list.length)).padStart(2, "0")} / {String(list.length).padStart(2, "0")}
        </p>
      </div>
    </section>
  );
}
