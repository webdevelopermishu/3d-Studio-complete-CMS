"use client";
import dynamic from "next/dynamic";

/**
 * Code-split entry points for the client scenes.
 *
 * Section renderers are server components that import every section type, so importing the
 * scenes directly would put all of them (plus the contact form's Zod and React Hook Form) in
 * every page's JavaScript. These wrappers are client components that load each scene with
 * next/dynamic: the scene still renders on the server, and its chunk is only referenced by
 * pages that actually render it. (Calling next/dynamic from a server component does not split
 * the chunk out of the page entry, which is why this file is a client module.)
 */
export const HeroFilmScene = dynamic(() => import("./HeroFilmScene").then((m) => m.HeroFilmScene));
export const CinemaHeroScene = dynamic(() => import("./CinemaHeroScene").then((m) => m.CinemaHeroScene));
export const DisciplineScene = dynamic(() => import("./DisciplineScene").then((m) => m.DisciplineScene));
export const CaseReelScene = dynamic(() => import("./CaseReelScene").then((m) => m.CaseReelScene));
export const VisionScene = dynamic(() => import("./VisionScene").then((m) => m.VisionScene));
export const MethodScene = dynamic(() => import("./MethodScene").then((m) => m.MethodScene));
export const HoverPreviewList = dynamic(() => import("./HoverPreviewList").then((m) => m.HoverPreviewList));
export const WorkWall = dynamic(() => import("./WorkWall").then((m) => m.WorkWall));
export const CaseIndex = dynamic(() => import("./CaseIndex").then((m) => m.CaseIndex));
export const ContactBriefForm = dynamic(() => import("./ContactBriefForm").then((m) => m.ContactBriefForm));
