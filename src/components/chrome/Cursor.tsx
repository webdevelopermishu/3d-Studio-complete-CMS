"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { ensureGsap, gsap, RICH_MQ } from "@/components/motion/gsap";

/**
 * Custom cursor (12px dot that grows with a label over [data-cursor-label] targets)
 * and magnetic circle buttons ([data-magnetic]). Fine pointers only; off for reduced motion.
 */
export function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    ensureGsap();
    const mq = window.matchMedia(RICH_MQ);
    if (!mq.matches || !dot.current) return;
    const el = dot.current;
    document.documentElement.classList.add("has-cursor");
    const xTo = gsap.quickTo(el, "x", { duration: 0.35, ease: "power3.out" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.35, ease: "power3.out" });
    let shown = false;

    const move = (e: PointerEvent) => {
      if (!shown) {
        gsap.set(el, { x: e.clientX, y: e.clientY });
        gsap.to(el, { autoAlpha: 1, duration: 0.3 });
        shown = true;
      }
      xTo(e.clientX);
      yTo(e.clientY);
    };
    const over = (e: PointerEvent) => {
      const t = (e.target as HTMLElement).closest<HTMLElement>("[data-cursor-label], [data-cursor], a, button, input, textarea, select, label");
      const text = t?.dataset.cursorLabel;
      const hide = t?.dataset.cursor === "hide" || t?.matches("input, textarea, select");
      if (label.current) label.current.textContent = text ?? "";
      gsap.to(el, {
        width: text ? 84 : t && !hide ? 34 : 12,
        height: text ? 84 : t && !hide ? 34 : 12,
        opacity: hide ? 0 : 1,
        backgroundColor: text ? "rgba(255,255,255,0.12)" : t ? "rgba(255,255,255,0)" : "#fff",
        borderWidth: t && !text ? 1 : 0,
        duration: 0.35,
        ease: "power3.out",
      });
      gsap.to(label.current, { opacity: text ? 1 : 0, duration: 0.25 });
    };
    const leaveWindow = () => {
      gsap.to(el, { autoAlpha: 0, duration: 0.2 });
      shown = false;
    };
    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerover", over, { passive: true });
    document.documentElement.addEventListener("pointerleave", leaveWindow);
    return () => {
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerover", over);
      document.documentElement.removeEventListener("pointerleave", leaveWindow);
      document.documentElement.classList.remove("has-cursor");
    };
  }, []);

  // Magnetic buttons — rebound per route
  useEffect(() => {
    if (!window.matchMedia(RICH_MQ).matches) return;
    ensureGsap();
    const cleanups: (() => void)[] = [];
    document.querySelectorAll<HTMLElement>("[data-magnetic]").forEach((btn) => {
      const lbl = btn.querySelector<HTMLElement>(".circle-btn__label");
      const fill = btn.querySelector<HTMLElement>(".circle-btn__fill");
      const onMove = (e: PointerEvent) => {
        const r = btn.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
        const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        gsap.to(btn, { x: dx * 14, y: dy * 14, duration: 0.5, ease: "power3.out" });
        if (lbl) gsap.to(lbl, { x: dx * 10, y: dy * 10, duration: 0.5, ease: "power3.out" });
      };
      const onEnter = () => fill && gsap.fromTo(fill, { scale: 0 }, { scale: 1, duration: 0.5, ease: "expo.out" });
      const onLeave = () => {
        gsap.to([btn, lbl], { x: 0, y: 0, duration: 0.7, ease: "elastic.out(1, 0.5)" });
        if (fill) gsap.to(fill, { scale: 0, duration: 0.45, ease: "expo.out" });
      };
      btn.addEventListener("pointermove", onMove);
      btn.addEventListener("pointerenter", onEnter);
      btn.addEventListener("pointerleave", onLeave);
      btn.dataset.magneticReady = "true";
      cleanups.push(() => {
        btn.removeEventListener("pointermove", onMove);
        btn.removeEventListener("pointerenter", onEnter);
        btn.removeEventListener("pointerleave", onLeave);
      });
    });
    return () => cleanups.forEach((c) => c());
  }, [pathname]);

  return (
    <div className="cursor" aria-hidden>
      <div ref={dot} className="cursor__dot">
        <span ref={label} className="cursor__label" />
      </div>
    </div>
  );
}
