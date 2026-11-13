"use client";
import { useEffect, useRef, useState } from "react";
import { ensureGsap, gsap, RICH_MQ } from "@/components/motion/gsap";
import { SmartLink } from "@/components/ui/Primitives";

export type PreviewItem = {
  href: string;
  title: string;
  meta?: string;
  image?: string | null;
  video?: string | null;
};

/**
 * "Keep exploring" list: ruled rows; on fine pointers a fixed 16:9 preview follows the cursor
 * and cross-fades between the hovered rows' media.
 */
export function HoverPreviewList({ items, label }: { items: PreviewItem[]; label: string }) {
  const preview = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const [rich, setRich] = useState(false);

  useEffect(() => {
    ensureGsap();
    const mq = window.matchMedia(RICH_MQ);
    setRich(mq.matches);
    const on = () => setRich(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  useEffect(() => {
    if (!rich || !preview.current) return;
    const el = preview.current;
    const yTo = gsap.quickTo(el, "y", { duration: 0.6, ease: "power3.out" });
    const move = (e: PointerEvent) => yTo(e.clientY - el.offsetHeight / 2);
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, [rich]);

  useEffect(() => {
    if (!rich || !preview.current) return;
    gsap.to(preview.current, { autoAlpha: active === null ? 0 : 1, scale: active === null ? 0.94 : 1, duration: 0.45, ease: "power3.out" });
  }, [active, rich]);

  return (
    <>
      <ul className="next-list" aria-label={label} onPointerLeave={() => setActive(null)}>
        {items.map((it, i) => (
          <li key={it.href + i} onPointerEnter={() => setActive(i)} onFocus={() => setActive(i)} onBlur={() => setActive(null)}>
            <SmartLink href={it.href} className="next-row">
              <span className="next-row__title">{it.title}</span>
              {it.meta && <span className="next-row__meta t-label">{it.meta}</span>}
              <span className="next-row__arrow" aria-hidden>
                →
              </span>
            </SmartLink>
          </li>
        ))}
      </ul>
      {rich && (
        <div ref={preview} className="hover-preview" aria-hidden>
          {items.map((it, i) => (
            <div key={i} className="hover-preview__pane" data-active={active === i}>
              {it.video && active === i ? (
                <video src={it.video} poster={it.image ?? undefined} muted loop playsInline autoPlay />
              ) : it.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.image} alt="" loading="lazy" />
              ) : null}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
