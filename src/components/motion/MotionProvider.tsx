"use client";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import { ensureGsap, gsap, ScrollTrigger, RICH_MQ, MOTION_OK_MQ } from "./gsap";

type Ctx = { lenis: Lenis | null };
const MotionCtx = createContext<Ctx>({ lenis: null });
export const useLenis = () => useContext(MotionCtx).lenis;

/**
 * Site-wide motion root:
 *  - Lenis smooth scroll driven by the GSAP ticker, synced to ScrollTrigger
 *  - Declarative reveals for [data-split] words, [data-reveal] blocks and [data-count] figures
 *    (IntersectionObserver), plus [data-parallax] media and [data-scrub-words] statements
 *    (ScrollTrigger, rich desktops only) — re-scanned on every route change
 *  - Everything is reverted on route change, so no ScrollTrigger outlives its page
 */
export function MotionProvider({ smooth = true, children }: { smooth?: boolean; children: ReactNode }) {
  const [lenis, setLenis] = useState<Lenis | null>(null);
  const pathname = usePathname();
  const ready = useRef(false);

  useEffect(() => {
    ensureGsap();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(hover: none), (pointer: coarse)").matches;
    if (!smooth || reduce || coarse) return;
    const l = new Lenis({ duration: 1.1, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
    l.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => l.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    setLenis(l);
    (window as unknown as { __lenis?: Lenis }).__lenis = l;
    return () => {
      gsap.ticker.remove(tick);
      l.destroy();
      setLenis(null);
    };
  }, [smooth]);

  // Declarative reveals, rebuilt per route
  useEffect(() => {
    ensureGsap();
    const root = document.getElementById("content");
    if (!root) return;
    const mm = gsap.matchMedia();

    mm.add({ motion: MOTION_OK_MQ, rich: RICH_MQ }, (c) => {
      const { motion, rich } = c.conditions as { motion: boolean; rich: boolean };
      if (!motion) return;

      // One-shot reveals use a single IntersectionObserver instead of one ScrollTrigger each:
      // nothing is measured up front, which keeps start-up cheap on slower phones.
      const reveal = (el: HTMLElement) =>
        c.add(() => {
          if (el.hasAttribute("data-split")) {
            gsap.fromTo(el.querySelectorAll("[data-word]"), { y: 0, yPercent: 110 }, { y: 0, yPercent: 0, duration: 1.1, ease: "expo.out", stagger: 0.045 });
          } else if (el.hasAttribute("data-count")) {
            const end = Number(el.dataset.count);
            const obj = { v: 0 };
            gsap.to(obj, { v: end, duration: 1.6, ease: "power2.out", onUpdate: () => (el.textContent = Math.round(obj.v).toLocaleString("en-US")) });
          } else {
            gsap.fromTo(el, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 1, ease: "power3.out", delay: Number(el.dataset.revealDelay ?? 0) });
          }
        });
      const io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (!e.isIntersecting) continue;
            io.unobserve(e.target);
            reveal(e.target as HTMLElement);
          }
        },
        { rootMargin: "0px 0px -10% 0px" },
      );
      root.querySelectorAll<HTMLElement>('[data-split]:not([data-split-manual]), [data-reveal]:not([data-reveal="load"])').forEach((el) => io.observe(el));
      root.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
        if (!Number.isFinite(Number(el.dataset.count))) return;
        el.textContent = "0";
        io.observe(el);
      });
      // Cleanup for this media-query branch (gsap.matchMedia calls it on revert or breakpoint change).
      const stop = () => io.disconnect();

      if (!rich) return stop;

      gsap.utils.toArray<HTMLElement>("[data-parallax]", root).forEach((el) => {
        const amt = Number(el.dataset.parallax || 12);
        gsap.fromTo(
          el,
          { yPercent: -amt / 2 },
          { yPercent: amt / 2, ease: "none", scrollTrigger: { trigger: el.parentElement ?? el, start: "top bottom", end: "bottom top", scrub: true } },
        );
      });

      gsap.utils.toArray<HTMLElement>("[data-scrub-words]", root).forEach((el) => {
        const words = el.querySelectorAll("[data-word]");
        gsap.fromTo(
          words,
          { opacity: 0.16 },
          { opacity: 1, stagger: 0.08, ease: "none", scrollTrigger: { trigger: el, start: "top 75%", end: "bottom 45%", scrub: true } },
        );
      });
      return stop;
    });

    // Fonts / images can shift layout after first paint
    const refresh = () => ScrollTrigger.refresh();
    document.fonts?.ready.then(refresh);
    window.addEventListener("load", refresh, { once: true });
    document.documentElement.classList.add("motion-ready");
    ready.current = true;
    return () => {
      mm.revert();
      window.removeEventListener("load", refresh);
    };
  }, [pathname]);

  return <MotionCtx.Provider value={{ lenis }}>{children}</MotionCtx.Provider>;
}
