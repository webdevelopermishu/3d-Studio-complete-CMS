"use client";
import { useLenis } from "@/components/motion/MotionProvider";

export function BackToTop() {
  const lenis = useLenis();
  return (
    <button
      type="button"
      className="circle-btn circle-btn--sm"
      style={{ ["--circle-size" as string]: "52px" }}
      aria-label="Back to top"
      data-magnetic
      onClick={() => {
        if (lenis) lenis.scrollTo(0, { duration: 1.4 });
        else window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
        document.getElementById("content")?.focus({ preventScroll: true });
      }}
    >
      <span className="circle-btn__fill" aria-hidden />
      <svg className="circle-btn__label" width="12" height="14" viewBox="0 0 12 14" aria-hidden>
        <path d="M6 13V1M1 6l5-5 5 5" fill="none" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    </button>
  );
}
