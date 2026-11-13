"use client";
import { useRef, type ReactNode } from "react";
import { ensureGsap, gsap, ScrollTrigger, useGSAP, RICH_MQ } from "@/components/motion/gsap";

/**
 * Pinned discipline panels: each panel cross-fades in (media settles from 1.08 scale, copy slides),
 * a 4-segment progress track fills and doubles as navigation. Stacked panels on touch / reduced motion.
 */
export function DisciplineScene({ children, count }: { children: ReactNode; count: number }) {
  const root = useRef<HTMLElement>(null);
  ensureGsap();
  useGSAP(
    () => {
      const el = root.current!;
      const mm = gsap.matchMedia();
      mm.add(RICH_MQ, () => {
        el.classList.add("xp--pinned");
        const panels = gsap.utils.toArray<HTMLElement>(".xp-panel", el);
        const fills = gsap.utils.toArray<HTMLElement>(".xp-track__fill", el);
        const tabs = gsap.utils.toArray<HTMLButtonElement>(".xp-track__tab", el);
        gsap.set(panels.slice(1), { autoAlpha: 0 });
        const tl = gsap.timeline({
          scrollTrigger: { trigger: el, start: "top top", end: "+=" + window.innerHeight * count, scrub: 0.5, pin: true },
        });
        panels.forEach((p, i) => {
          const media = p.querySelector(".xp-panel__media");
          const content = p.querySelector(".xp-panel__content");
          if (i > 0) {
            const prev = panels[i - 1].querySelector(".xp-panel__content");
            tl.to(prev, { autoAlpha: 0, yPercent: -12, duration: 0.25 }, i - 0.45);
            tl.to(p, { autoAlpha: 1, duration: 0.35 }, i - 0.35);
            tl.fromTo(media, { scale: 1.08 }, { scale: 1, duration: 1 }, i - 0.35);
            tl.fromTo(content, { yPercent: 18, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.5 }, i - 0.2);
          } else {
            tl.fromTo(media, { scale: 1.08 }, { scale: 1, duration: 1 }, 0);
          }
          if (fills[i]) tl.fromTo(fills[i], { scaleX: 0 }, { scaleX: 1, ease: "none", duration: 1 }, i);
        });
        const st = tl.scrollTrigger as ScrollTrigger;
        const handlers = tabs.map((tab, i) => {
          const h = () => {
            const y = st.start + ((st.end - st.start) * (i + 0.05)) / count;
            const lenis = (window as unknown as { __lenis?: { scrollTo: (y: number, o: object) => void } }).__lenis;
            if (lenis) lenis.scrollTo(y, { duration: 1.2 });
            else window.scrollTo({ top: y, behavior: "smooth" });
          };
          tab.addEventListener("click", h);
          return () => tab.removeEventListener("click", h);
        });
        return () => {
          handlers.forEach((h) => h());
          el.classList.remove("xp--pinned");
        };
      });
    },
    { scope: root },
  );
  return (
    <section ref={root} className="xp" data-ground="dark">
      {children}
    </section>
  );
}
