"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";

/** Muted looping video that only loads near the viewport and pauses when off-screen. */
export function LazyVideo({
  src,
  poster,
  className,
  label,
  eager,
  style,
}: {
  src: string;
  poster?: string;
  className?: string;
  label?: string;
  eager?: boolean;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [load, setLoad] = useState(!!eager);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setLoad(true);
          if (!reduce.matches) el.play().catch(() => {});
        } else {
          el.pause();
        }
      },
      { rootMargin: "300px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || !load) return;
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) el.play().catch(() => {});
  }, [load]);

  return (
    <video
      ref={ref}
      className={className}
      src={load ? src : undefined}
      poster={poster}
      muted
      loop
      playsInline
      preload={eager ? "auto" : "none"}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={style}
    />
  );
}
