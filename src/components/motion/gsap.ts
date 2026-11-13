"use client";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

let registered = false;
export function ensureGsap() {
  if (!registered && typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger, useGSAP);
    ScrollTrigger.config({ ignoreMobileResize: true });
    registered = true;
  }
  return { gsap, ScrollTrigger };
}

/**
 * Rich scroll scenes (pinning, scrubbing, cursor effects) only run where the reference runs them:
 * wide, landscape, fine pointer with hover, and no reduced-motion preference.
 */
export const RICH_MQ =
  "(min-width: 901px) and (orientation: landscape) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";
export const MOTION_OK_MQ = "(prefers-reduced-motion: no-preference)";

export { gsap, ScrollTrigger, useGSAP };
