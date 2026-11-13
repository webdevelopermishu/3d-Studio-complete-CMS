import { describe, expect, it } from "vitest";
import { sections, SECTION_TYPES, parseSectionData, getSectionDef, isSectionType } from "@/sections/registry";
import { collectMediaIds, defaultsOf, f, objectSchema, type FieldDef } from "@/sections/fields";

describe("section registry", () => {
  it("registers every section with a unique type key that matches its object key", () => {
    for (const [key, def] of Object.entries(sections)) expect(def.type).toBe(key);
    expect(new Set(SECTION_TYPES).size).toBe(SECTION_TYPES.length);
    expect(SECTION_TYPES.length).toBeGreaterThanOrEqual(30);
  });

  it.each(SECTION_TYPES)("%s: defaults satisfy its own schema", (type) => {
    const def = sections[type];
    const parsed = parseSectionData(type, def.defaults());
    expect(parsed.ok).toBe(true);
  });

  it("fills missing fields with defaults (old content keeps rendering after schema changes)", () => {
    const r = parseSectionData("gateway", { title: "Only a title" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.title).toBe("Only a title");
      expect(r.data.link).toEqual({ label: "View the work", href: "/work" });
      expect(r.data.media).toBeNull();
    }
  });

  it("coerces wrong types back to defaults instead of crashing", () => {
    const r = parseSectionData("figures", { title: 42, items: "nope" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(typeof r.data.title).toBe("string");
      expect(Array.isArray(r.data.items)).toBe(true);
    }
  });

  it("rejects unknown section types safely", () => {
    expect(isSectionType("nope")).toBe(false);
    expect(getSectionDef("nope")).toBeNull();
    const r = parseSectionData("nope", {});
    expect(r.ok).toBe(false);
  });

  it("enforces select options", () => {
    const r = parseSectionData("caseMedia", { layout: "sideways" });
    expect(r.ok && r.data.layout).toBe("bleed");
  });
});

describe("field helpers", () => {
  it("collects media ids from nested lists", () => {
    const fields = sections.clientWall.fields as unknown as Record<string, FieldDef<unknown>>;
    const ids = collectMediaIds(fields, { logos: [{ name: "a", logo: "m1" }, { name: "b", logo: "m2" }, { name: "c", logo: null }] });
    expect([...ids].sort()).toEqual(["m1", "m2"]);
  });

  it("builds object schemas and defaults from field definitions", () => {
    const fields = { a: f.text("A", "x"), b: f.boolean("B", true), c: f.list("C", { d: f.number("D", 2) }) };
    expect(defaultsOf(fields)).toEqual({ a: "x", b: true, c: [] });
    const schema = objectSchema(fields);
    expect(schema.parse({ c: [{}] })).toEqual({ a: "x", b: true, c: [{ d: 2 }] });
  });

  it("caps text length via schema", () => {
    const fld = f.text("T", "", { max: 5 });
    expect(fld.schema.parse("toolongvalue")).toBe("");
  });
});
