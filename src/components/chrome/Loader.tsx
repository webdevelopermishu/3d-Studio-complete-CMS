"use client";
import { useEffect, useRef } from "react";

/**
 * First-visit loader: a percentage counter that tracks real asset loading (fonts + above-the-fold
 * images), capped at ~1.4s. Rendered in the server HTML; an inline script in <head> skips it on
 * repeat visits within a session and for reduced motion, and a CSS fallback hides it without JS.
 */
export function Loader() {
  const root = useRef<HTMLDivElement>(null);
  const num = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const html = document.documentElement;
    if (html.classList.contains("no-loader")) {
      el.remove();
      return;
    }
    try {
      sessionStorage.setItem("loader-seen", "1");
    } catch {}
    let shown = 0;
    let target = 10;
    const start = performance.now();
    const imgs = [...document.querySelectorAll<HTMLImageElement>("#content img")].slice(0, 6);
    const tasks: Promise<unknown>[] = [document.fonts?.ready ?? Promise.resolve(), ...imgs.map((i) => (i.complete ? Promise.resolve() : new Promise((r) => { i.addEventListener("load", r, { once: true }); i.addEventListener("error", r, { once: true }); })))];
    let done = 0;
    tasks.forEach((t) => t.then(() => (target = Math.max(target, 10 + (++done / tasks.length) * 90))));
    let raf = 0;
    const tick = (now: number) => {
      const elapsed = now - start;
      if (elapsed > 1400) target = 100;
      shown += (target - shown) * 0.12;
      if (target === 100 && shown > 99.4) shown = 100;
      if (num.current) num.current.textContent = `${Math.round(shown)}%`;
      if (shown >= 100) {
        html.classList.add("loaded");
        setTimeout(() => el.remove(), 900);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div ref={root} className="loader" aria-hidden>
      <span ref={num} className="loader__count">
        0%
      </span>
    </div>
  );
}
