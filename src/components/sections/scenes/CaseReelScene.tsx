"use client";
import { useRef, type ReactNode } from "react";
import { ensureGsap, gsap, useGSAP, RICH_MQ } from "@/components/motion/gsap";

/** Pinned horizontal reel: vertical scroll drives the track sideways. Native swipe row on touch. */
export function CaseReelScene({ children }: { children: ReactNode }) {
  const root = useRef<HTMLElement>(null);
  ensureGsap();
  useGSAP(
    () => {
      const el = root.current!;
      const track = el.querySelector<HTMLElement>(".reel__track");
      const mm = gsap.matchMedia();
      mm.add(RICH_MQ, () => {
        if (!track) return;
        el.classList.add("reel--pinned");
        const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);
        gsap.to(track, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: { trigger: el, start: "top top", end: () => "+=" + distance(), scrub: 0.6, pin: true, invalidateOnRefresh: true },
        });
        const word = el.querySelector(".reel-word");
        if (word) gsap.fromTo(word, { autoAlpha: 0, y: 48 }, { autoAlpha: 1, y: 0, duration: 1, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 70%", once: true } });
        return () => el.classList.remove("reel--pinned");
      });
    },
    { scope: root },
  );
  return (
    <section ref={root} className="reel" data-ground="dark" aria-roledescription="carousel">
      {children}
    </section>
  );
}
