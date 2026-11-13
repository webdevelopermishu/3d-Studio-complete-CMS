"use client";
import { useRef, type ReactNode } from "react";
import { ensureGsap, gsap, useGSAP, RICH_MQ, MOTION_OK_MQ } from "@/components/motion/gsap";

/**
 * Home hero: the film starts inside a 16:10 frame and grows to full-bleed while the section is pinned
 * over a runway; the stacked title rises word by word on load, then drifts up as the frame opens.
 */
export function HeroFilmScene({ children }: { children: ReactNode }) {
  const root = useRef<HTMLElement>(null);
  ensureGsap();
  useGSAP(
    () => {
      const el = root.current!;
      const frame = el.querySelector<HTMLElement>(".hero__frame");
      const title = el.querySelector<HTMLElement>(".hero__title");
      const words = el.querySelectorAll("[data-word]");
      const sub = el.querySelector<HTMLElement>(".hero__subtitle-inner");
      const mm = gsap.matchMedia();

      mm.add(MOTION_OK_MQ, () => {
        const intro = gsap.timeline({ delay: document.documentElement.classList.contains("no-loader") ? 0.1 : 1.2 });
        intro.fromTo(words, { y: 0, yPercent: 110 }, { y: 0, yPercent: 0, duration: 1.3, ease: "expo.out", stagger: 0.07 });
        if (sub) intro.fromTo(sub, { y: 0, yPercent: 110 }, { y: 0, yPercent: 0, duration: 1, ease: "expo.out" }, "-=0.9");
      });

      mm.add(RICH_MQ, () => {
        if (!frame) return;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        // Start as a centred 68%-wide 16:10 window
        const startW = Math.min(vw * 0.68, 980);
        const startH = startW / 1.6;
        const x = Math.round((vw - startW) / 2);
        const top = Math.round(Math.max((vh - startH) / 2 + vh * 0.04, 0));
        const bottom = Math.round(Math.max(vh - startH - top, 0));
        const from = `inset(${top}px ${x}px ${bottom}px ${x}px)`;
        gsap.set(frame, { clipPath: from });
        const tl = gsap.timeline({
          scrollTrigger: { trigger: el, start: "top top", end: "+=" + vh * 1.2, scrub: 0.6, pin: true, pinSpacing: true },
        });
        tl.fromTo(frame, { clipPath: from }, { clipPath: "inset(0px 0px 0px 0px)", ease: "none" }, 0);
        if (title) tl.to(title, { yPercent: -18, opacity: 0.0, ease: "none" }, 0.35);
      });
    },
    { scope: root },
  );
  return (
    <section ref={root} className="hero hero--film" data-ground="dark">
      {children}
    </section>
  );
}
