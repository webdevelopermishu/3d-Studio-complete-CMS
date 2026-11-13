import type { MediaRef } from "@/lib/media/url";
import type { SectionData, SectionType } from "@/sections/registry";
import type { Settings } from "@/server/queries";

export type SectionOwner =
  | { type: "page"; id: string; slug: string }
  | { type: "project"; id: string; slug: string }
  | { type: "service"; id: string; slug: string; offerings: string[] };

export type SectionContext = {
  preview: boolean;
  owner: SectionOwner;
  settings: Settings;
};

export type SectionProps<T extends SectionType> = {
  id: string;
  index: number;
  data: SectionData<T>;
  media: Map<string, MediaRef>;
  ctx: SectionContext;
};

export const m = (media: Map<string, MediaRef>, id: string | null | undefined) => (id ? media.get(id) ?? null : null);
