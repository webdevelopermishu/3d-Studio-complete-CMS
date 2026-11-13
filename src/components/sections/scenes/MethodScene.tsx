"use client";
import { useRef, type ReactNode } from "react";
import { ensureGsap, gsap, useGSAP, RICH_MQ } from "@/components/motion/gsap";

/** Pinned process: steps enter one by one while a progress rule fills underneath. */
export function MethodScene({ children, steps }: { children: ReactNode; steps: number }) {
  const root = useRef<HTMLElement>(null);
  ensureGsap();
  useGSAP(
    () => {
      const el = root.current!;
      const mm = gsap.matchMedia();
      mm.add(RICH_MQ, () => {
        el.classList.add("method--pinned");
        const items = el.querySelectorAll<HTMLElement>(".method__step");
        const fill = el.querySelector(".method__rule-fill");
        const tl = gsap.timeline({
          scrollTrigger: { trigger: el, start: "top top", end: "+=" + window.innerHeight * Math.max(1.5, steps * 0.6), scrub: 0.6, pin: true },
        });
        tl.fromTo(fill, { scaleX: 0 }, { scaleX: 1, ease: "none", duration: steps }, 0);
        items.forEach((it, i) => tl.fromTo(it, { autoAlpha: 0.12, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.6 }, i));
        return () => el.classList.remove("method--pinned");
      });
    },
    { scope: root },
  );
  return (
    <section ref={root} className="method" data-ground="dark" style={{ ["--method-steps" as string]: steps }}>
      {children}
    </section>
  );
}
