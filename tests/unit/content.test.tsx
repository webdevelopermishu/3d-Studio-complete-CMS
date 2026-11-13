import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RichText, richTextToPlain } from "@/components/ui/RichText";
import { lintEntry, duplicateTitles, effectiveTitle } from "@/lib/seo/lint";
import { briefSchema, BRIEF_STEPS } from "@/lib/validation/contact";
import { slugify, formatShortDate, truncate } from "@/lib/utils";
import { imageUrl, srcSet, videoPosterUrl, type MediaRef } from "@/lib/media/url";

describe("rich text renderer", () => {
  const doc = {
    type: "doc",
    content: [
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Light first" }] },
      { type: "paragraph", content: [{ type: "text", text: "Bold", marks: [{ type: "bold" }] }, { type: "text", text: " link", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }] }] },
      { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "One" }] }] }] },
      { type: "script", content: [{ type: "text", text: "evil" }] },
    ],
  };
  it("renders headings with anchors, marks and lists", () => {
    const html = renderToStaticMarkup(<RichText doc={doc} />);
    expect(html).toContain('<h2 id="light-first" class="prose__h2">');
    expect(html).toContain("<strong>Bold</strong>");
    expect(html).toContain('<li class="prose__item">');
  });
  it("neutralises unsafe links and drops unknown nodes", () => {
    const html = renderToStaticMarkup(<RichText doc={doc} />);
    expect(html).not.toContain("javascript:");
    expect(html).toContain('href="#"');
    expect(html).not.toContain("evil");
  });
  it("returns nothing for empty docs and extracts plain text", () => {
    expect(renderToStaticMarkup(<RichText doc={null} />)).toBe("");
    expect(richTextToPlain(doc)).toContain("Light first");
  });
});

describe("SEO lint", () => {
  const base = { title: "Product & 3D", hasOgImage: true, slug: "product-3d", titleTemplate: "%s | Halden" };
  it("flags a missing description as an error", () => {
    expect(lintEntry({ ...base, description: "" }).map((i) => i.code)).toContain("description.missing");
  });
  it("checks title and description lengths", () => {
    const codes = lintEntry({ ...base, seoTitle: "x".repeat(70), description: "short" }).map((i) => i.code);
    expect(codes).toEqual(expect.arrayContaining(["title.long", "description.short"]));
  });
  it("checks focus keyword placement", () => {
    const codes = lintEntry({ ...base, description: "A description that is long enough to pass the minimum length check easily.", focusKeyword: "packshot" }).map((i) => i.code);
    expect(codes).toContain("keyword.title");
  });
  it("warns when noindex pages remain in the sitemap", () => {
    expect(lintEntry({ ...base, description: "d".repeat(100), robotsIndex: false, inSitemap: true }).map((i) => i.code)).toContain("robots.sitemap");
  });
  it("applies the title template and detects duplicates", () => {
    expect(effectiveTitle({ title: "Work", titleTemplate: "%s | Halden" })).toBe("Work | Halden");
    expect([...duplicateTitles([{ key: "a", title: "Same" }, { key: "b", title: "same" }, { key: "c", title: "Other" }])].sort()).toEqual(["a", "b"]);
  });
});

describe("contact brief validation", () => {
  const valid = {
    disciplines: ["Product & 3D"], services: ["Lifestyle scenes"], description: "We need twelve lifestyle renders for a new chair.",
    budget: "$2,500 to $5,000", timeline: "Within a month", name: "Ada", email: "ada@example.com",
  };
  it("accepts a complete brief", () => expect(briefSchema.safeParse(valid).success).toBe(true));
  it("requires disciplines, a description and a valid email", () => {
    const r = briefSchema.safeParse({ ...valid, disciplines: [], description: "short", email: "nope" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.map((i) => i.path[0])).toEqual(expect.arrayContaining(["disciplines", "description", "email"]));
  });
  it("rejects non-http reference links and a filled honeypot", () => {
    expect(briefSchema.safeParse({ ...valid, referenceUrl: "javascript:1" }).success).toBe(false);
    expect(briefSchema.safeParse({ ...valid, website: "spam" }).success).toBe(false);
  });
  it("covers every schema field in exactly one wizard step", () => {
    const stepFields = BRIEF_STEPS.flatMap((s) => s.fields);
    const schemaFields = Object.keys(briefSchema.shape).filter((k) => k !== "website");
    expect(new Set(stepFields)).toEqual(new Set(schemaFields));
    expect(stepFields.length).toBe(new Set(stepFields).size);
  });
});

describe("utilities", () => {
  it("slugifies", () => {
    expect(slugify("Architecture & Real Estate")).toBe("architecture-and-real-estate");
    expect(slugify("Café Déjà Vu!")).toBe("cafe-deja-vu");
    expect(slugify("About / Our Team", true)).toBe("about/our-team");
  });
  it("formats dates as DD.MM.YY", () => expect(formatShortDate(new Date("2026-11-05T10:00:00Z"))).toBe("05.11.26"));
  it("truncates", () => expect(truncate("abcdef", 4)).toBe("abc…"));
});

describe("media URLs", () => {
  const local: MediaRef = { id: "1", kind: "IMAGE", provider: "local", url: "/media/2026/11/a.jpg", width: 2400, height: 1500, alt: "", blurDataUrl: null };
  it("builds local resize URLs snapped to the width ladder", () => {
    expect(imageUrl(local.url, 900)).toBe("/media/2026/11/a.jpg?w=1080&q=75");
    expect(srcSet(local.url)).toContain("2560w");
  });
  it("builds Cloudinary transforms", () => {
    const u = "https://res.cloudinary.com/demo/image/upload/v1/studio/a.jpg";
    expect(imageUrl(u, 640)).toBe("https://res.cloudinary.com/demo/image/upload/f_auto,q_auto:eco,c_limit,w_640/v1/studio/a.jpg");
    const vid: MediaRef = { ...local, kind: "VIDEO", url: "https://res.cloudinary.com/demo/video/upload/v1/studio/a.mp4" };
    expect(videoPosterUrl(vid)).toMatch(/\/video\/upload\/so_0,.*\/studio\/a\.jpg$/);
  });
});
