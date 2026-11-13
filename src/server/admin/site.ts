"use server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { FONT_OPTIONS } from "@/lib/theme";
import { guarded, optStr, revalidateSite, audit } from "./guard";

const hex = z
  .string()
  .trim()
  .regex(/^$|^#(?:[0-9a-f]{3}){1,2}$/i, "Use a hex colour like #3a4cc0")
  .optional();

const settingsSchema = z.object({
  siteName: z.string().trim().min(1, "Site name is required.").max(80),
  tagline: optStr(300),
  email: z.union([z.literal(""), z.email("Enter a valid email.")]).optional(),
  phone: optStr(60),
  address: optStr(300),
  logoId: optStr(60),
  logoMarkId: optStr(60),
  faviconId: optStr(60),
  theme: z.object({
    accent: hex, accentHi: hex, accentLo: hex, background: hex, text: hex,
    font: z.enum(Object.keys(FONT_OPTIONS) as [string, ...string[]]).default("source-sans"),
  }),
  features: z.object({ showLoader: z.boolean(), customCursor: z.boolean(), smoothScroll: z.boolean() }),
  footerCta: z.string().trim().min(1).max(40),
  copyright: optStr(120),
  cookieText: optStr(600),
  analyticsId: z.string().trim().regex(/^$|^G-[A-Z0-9]{4,}$/, "GA4 IDs look like G-XXXXXXX").optional(),
});

export async function saveSettings(input: unknown) {
  return guarded("settings.write", settingsSchema, input, async (d, user) => {
    const data = { ...d, email: d.email || null, analyticsId: d.analyticsId || null, theme: d.theme as Prisma.InputJsonValue, features: d.features as Prisma.InputJsonValue };
    await db.globalSettings.upsert({ where: { id: "global" }, update: data, create: { id: "global", ...data } });
    await audit(user, "settings.update", "settings", "global");
    revalidateSite();
  });
}

const seoDefaultsSchema = z.object({
  titleTemplate: z.string().trim().max(120).refine((v) => !v || v.includes("%s"), "Include %s where the page title goes."),
  description: z.string().trim().max(300),
  ogImageId: optStr(60),
  twitterHandle: z.string().trim().max(40).regex(/^$|^@?\w{1,30}$/, "Like @studio"),
});

export async function saveSeoDefaults(input: unknown) {
  return guarded("seo.write", seoDefaultsSchema, input, async (d, user) => {
    await db.globalSettings.update({ where: { id: "global" }, data: { seoDefaults: d as Prisma.InputJsonValue } });
    await audit(user, "seo.defaults", "settings", "global");
    revalidateSite();
  });
}
