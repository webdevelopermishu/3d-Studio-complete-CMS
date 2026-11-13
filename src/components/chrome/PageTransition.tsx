"use client";
import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ensureGsap, gsap } from "@/components/motion/gsap";

/**
 * Curtain route transition: intercepts same-origin link clicks, wipes a black curtain up,
 * navigates, scrolls to top under cover, then wipes it away. Skipped for modified clicks,
 * hash links, downloads, new tabs, /admin and reduced motion.
 */
export function PageTransition() {
  const curtain = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const pending = useRef(false);

  useEffect(() => {
    ensureGsap();
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement).closest("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download") || a.dataset.noTransition !== undefined) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname.startsWith("/admin") || url.pathname.startsWith("/api")) return;
      if (url.pathname === location.pathname) return; // hash / same page: let the browser handle it
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !curtain.current) return;
      e.preventDefault();
      pending.current = true;
      const el = curtain.current;
      gsap.set(el, { display: "block", transformOrigin: "50% 100%", scaleY: 0 });
      gsap.to(el, {
        scaleY: 1, duration: 0.55, ease: "expo.inOut",
        onComplete: () => router.push(url.pathname + url.search + url.hash),
      });
    };
    // Capture phase: runs before next/link, whose handler then sees defaultPrevented and stands down.
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [router]);

  useEffect(() => {
    const el = curtain.current;
    const lenis = (window as unknown as { __lenis?: { scrollTo: (y: number, o: object) => void } }).__lenis;
    if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
    else window.scrollTo(0, 0);
    if (!pending.current || !el) return;
    pending.current = false;
    gsap.set(el, { transformOrigin: "50% 0%" });
    gsap.to(el, { scaleY: 0, duration: 0.65, delay: 0.08, ease: "expo.inOut", onComplete: () => gsap.set(el, { display: "none" }) });
    document.getElementById("content")?.focus({ preventScroll: true });
  }, [pathname]);

  return <div ref={curtain} className="curtain" aria-hidden />;
}
