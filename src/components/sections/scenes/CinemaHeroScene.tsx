"use client";
import { useRef, type ReactNode } from "react";
import { ensureGsap, gsap, useGSAP, RICH_MQ, MOTION_OK_MQ } from "@/components/motion/gsap";

/** Inner-page hero: media opens from a centred frame to full-bleed while pinned; title rises. */
export function CinemaHeroScene({ children, hasMedia }: { children: ReactNode; hasMedia: boolean }) {
  const root = useRef<HTMLElement>(null);
  ensureGsap();
  useGSAP(
    () => {
      const el = root.current!;
      const frame = el.querySelector<HTMLElement>(".cinema__frame");
      const title = el.querySelector<HTMLElement>(".cinema__title");
      const words = el.querySelectorAll("[data-word]");
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK_MQ, () => {
        gsap.fromTo(words, { y: 0, yPercent: 110 }, { y: 0, yPercent: 0, duration: 1.2, ease: "expo.out", stagger: 0.06, delay: 0.25 });
      });
      mm.add(RICH_MQ, () => {
        if (!frame || !hasMedia) return;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const w = Math.min(vw * 0.68, 980);
        const x = Math.round((vw - w) / 2);
        const from = `inset(${Math.round(vh * 0.16)}px ${x}px 0px ${x}px)`;
        gsap.set(frame, { clipPath: from });
        const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: "top top", end: "+=" + vh, scrub: 0.6, pin: true } });
        tl.fromTo(frame, { clipPath: from }, { clipPath: "inset(0px 0px 0px 0px)", ease: "none" }, 0);
        if (title) tl.fromTo(title, { y: 0 }, { y: -vh * 0.06, ease: "none" }, 0);
      });
    },
    { scope: root },
  );
  return (
    <section ref={root} className="cinema" data-ground="dark">
      {children}
    </section>
  );
}
