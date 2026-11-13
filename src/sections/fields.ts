import { z } from "zod";

// Also runs in the admin (browser) under a CSP without eval: skip Zod's `new Function` probe.
z.config({ jitless: true });

/**
 * Field builder for section content schemas.
 * Each field carries: a Zod schema (validation + defaults), a default value,
 * and a UI descriptor the admin editor uses to render the right control.
 */

export type RefEntity = "project" | "service" | "article";

export type FieldUI =
  | { kind: "text"; label: string; help?: string; multiline?: boolean; max?: number; placeholder?: string }
  | { kind: "richtext"; label: string; help?: string }
  | { kind: "media"; label: string; help?: string; accept: "image" | "video" | "any" }
  | { kind: "link"; label: string; help?: string }
  | { kind: "select"; label: string; help?: string; options: { value: string; label: string }[] }
  | { kind: "boolean"; label: string; help?: string }
  | { kind: "number"; label: string; help?: string; min?: number; max?: number }
  | { kind: "refs"; label: string; help?: string; entity: RefEntity; max?: number }
  | { kind: "strings"; label: string; help?: string; max?: number }
  | { kind: "list"; label: string; help?: string; fields: Record<string, FieldDef<unknown>>; itemLabel?: string; max?: number };

export type FieldDef<T> = { ui: FieldUI; schema: z.ZodType<T>; default: T };

export type Link = { label: string; href: string };
/** ProseMirror / Tiptap JSON document */
export type RichDoc = { type: "doc"; content?: unknown[] } | null;

type Opts = { help?: string };

export const f = {
  text(label: string, def = "", o: Opts & { multiline?: boolean; max?: number; placeholder?: string } = {}): FieldDef<string> {
    const max = o.max ?? (o.multiline ? 4000 : 400);
    return {
      ui: { kind: "text", label, ...o, max },
      schema: z.string().max(max).catch(def).default(def) as unknown as z.ZodType<string>,
      default: def,
    };
  },
  richtext(label: string, def: RichDoc = null, o: Opts = {}): FieldDef<RichDoc> {
    return {
      ui: { kind: "richtext", label, ...o },
      schema: z
        .object({ type: z.literal("doc"), content: z.array(z.unknown()).optional() })
        .nullable()
        .catch(def)
        .default(def) as unknown as z.ZodType<RichDoc>,
      default: def,
    };
  },
  media(label: string, accept: "image" | "video" | "any" = "image", o: Opts = {}): FieldDef<string | null> {
    return {
      ui: { kind: "media", label, accept, ...o },
      schema: z.string().min(1).nullable().catch(null).default(null) as unknown as z.ZodType<string | null>,
      default: null,
    };
  },
  link(label: string, def: Link = { label: "", href: "" }, o: Opts = {}): FieldDef<Link> {
    return {
      ui: { kind: "link", label, ...o },
      schema: z
        .object({ label: z.string().max(120).default(""), href: z.string().max(600).default("") })
        .catch(def)
        .default(def) as unknown as z.ZodType<Link>,
      default: def,
    };
  },
  select<T extends string>(label: string, options: readonly { value: T; label: string }[], def: T, o: Opts = {}): FieldDef<T> {
    const values = options.map((x) => x.value) as [T, ...T[]];
    return {
      ui: { kind: "select", label, options: options as unknown as { value: string; label: string }[], ...o },
      schema: z.enum(values).catch(def).default(def) as unknown as z.ZodType<T>,
      default: def,
    };
  },
  boolean(label: string, def = false, o: Opts = {}): FieldDef<boolean> {
    return { ui: { kind: "boolean", label, ...o }, schema: z.boolean().catch(def).default(def) as unknown as z.ZodType<boolean>, default: def };
  },
  number(label: string, def = 0, o: Opts & { min?: number; max?: number } = {}): FieldDef<number> {
    let s = z.number();
    if (o.min !== undefined) s = s.min(o.min);
    if (o.max !== undefined) s = s.max(o.max);
    return { ui: { kind: "number", label, ...o }, schema: s.catch(def).default(def) as unknown as z.ZodType<number>, default: def };
  },
  refs(label: string, entity: RefEntity, o: Opts & { max?: number } = {}): FieldDef<string[]> {
    return {
      ui: { kind: "refs", label, entity, ...o },
      schema: z.array(z.string()).max(o.max ?? 50).catch([]).default([]) as unknown as z.ZodType<string[]>,
      default: [],
    };
  },
  strings(label: string, def: string[] = [], o: Opts & { max?: number } = {}): FieldDef<string[]> {
    return {
      ui: { kind: "strings", label, ...o },
      schema: z.array(z.string().max(400)).max(o.max ?? 60).catch(def).default(def) as unknown as z.ZodType<string[]>,
      default: def,
    };
  },
  list<F extends Record<string, FieldDef<unknown>>>(
    label: string,
    fields: F,
    def: InferFields<F>[] = [],
    o: Opts & { itemLabel?: string; max?: number } = {},
  ): FieldDef<InferFields<F>[]> {
    const item = objectSchema(fields);
    return {
      ui: { kind: "list", label, fields, ...o },
      schema: z.array(item).max(o.max ?? 60).catch(def).default(def) as unknown as z.ZodType<InferFields<F>[]>,
      default: def,
    };
  },
};

export type InferFields<F> = { [K in keyof F]: F[K] extends FieldDef<infer T> ? T : never };

export function objectSchema<F extends Record<string, FieldDef<unknown>>>(fields: F) {
  const shape: Record<string, z.ZodType> = {};
  for (const [k, v] of Object.entries(fields)) shape[k] = v.schema;
  return z.object(shape) as unknown as z.ZodType<InferFields<F>>;
}

export function defaultsOf<F extends Record<string, FieldDef<unknown>>>(fields: F): InferFields<F> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) out[k] = structuredClone(v.default);
  return out as InferFields<F>;
}

/** Walk data with its field defs and collect every referenced media id. */
export function collectMediaIds(fields: Record<string, FieldDef<unknown>>, data: Record<string, unknown>, out = new Set<string>()) {
  for (const [k, def] of Object.entries(fields)) {
    const v = data?.[k];
    if (def.ui.kind === "media" && typeof v === "string") out.add(v);
    if (def.ui.kind === "list" && Array.isArray(v)) {
      const sub = def.ui.fields;
      for (const item of v) collectMediaIds(sub, item as Record<string, unknown>, out);
    }
  }
  return out;
}

export function collectRefs(fields: Record<string, FieldDef<unknown>>, data: Record<string, unknown>, out: Record<RefEntity, Set<string>>) {
  for (const [k, def] of Object.entries(fields)) {
    const v = data?.[k];
    if (def.ui.kind === "refs" && Array.isArray(v)) v.forEach((id) => out[def.ui.kind === "refs" ? (def.ui as { entity: RefEntity }).entity : "project"].add(String(id)));
    if (def.ui.kind === "list" && Array.isArray(v)) for (const item of v) collectRefs(def.ui.fields, item as Record<string, unknown>, out);
  }
  return out;
}
