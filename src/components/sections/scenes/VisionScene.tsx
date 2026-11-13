"use client";
import { useRef, type ReactNode } from "react";
import { ensureGsap, gsap, useGSAP, RICH_MQ } from "@/components/motion/gsap";

/** Pinned film; statements fade in and out one after another (left / right / left). */
export function VisionScene({ children, count }: { children: ReactNode; count: number }) {
  const root = useRef<HTMLElement>(null);
  ensureGsap();
  useGSAP(
    () => {
      const el = root.current!;
      const mm = gsap.matchMedia();
      mm.add(RICH_MQ, () => {
        el.classList.add("vision--pinned");
        const lines = el.querySelectorAll<HTMLElement>(".vision__statement");
        const scrim = el.querySelector(".vision__scrim");
        const tl = gsap.timeline({
          scrollTrigger: { trigger: el, start: "top top", end: "+=" + window.innerHeight * (count + 0.5), scrub: 0.6, pin: true },
        });
        tl.to(scrim, { autoAlpha: 1, duration: 0.5 });
        lines.forEach((l, i) => {
          tl.fromTo(l, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.6 }, i === 0 ? 0.2 : ">");
          if (i < lines.length - 1) tl.to(l, { autoAlpha: 0, y: -30, duration: 0.5 }, ">0.6");
        });
        tl.to({}, { duration: 0.4 });
        return () => el.classList.remove("vision--pinned");
      });
    },
    { scope: root },
  );
  return (
    <section ref={root} className="vision" data-ground="dark">
      {children}
    </section>
  );
}
