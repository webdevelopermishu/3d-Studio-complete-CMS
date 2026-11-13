"use client";
import { useState } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { defaultsOf, type FieldDef } from "@/sections/fields";
import { Button, Field, Input, Select, Textarea, Toggle } from "./ui";
import { MediaPicker } from "./MediaPicker";
import { RefPicker, StringList } from "./pickers";
import { RichTextEditor } from "./RichTextEditor";

type Fields = Record<string, FieldDef<unknown>>;
type Data = Record<string, unknown>;

/** Renders an editing form from a section's typed field descriptors (recursive for lists). */
export function SectionFieldsForm({ fields, value, onChange, errors = {}, path = "" }: { fields: Fields; value: Data; onChange: (v: Data) => void; errors?: Record<string, string>; path?: string }) {
  const set = (k: string, v: unknown) => onChange({ ...value, [k]: v });
  return (
    <div className="flex flex-col gap-5">
      {Object.entries(fields).map(([key, def]) => {
        const ui = def.ui;
        const id = `f-${path}${key}`;
        const err = errors[`${path}${key}`];
        const v = value?.[key];
        switch (ui.kind) {
          case "text":
            return (
              <Field key={key} label={ui.label} help={ui.help} error={err} htmlFor={id}>
                {ui.multiline ? (
                  <Textarea id={id} value={String(v ?? "")} maxLength={ui.max} placeholder={ui.placeholder} rows={3} onChange={(e) => set(key, e.target.value)} />
                ) : (
                  <Input id={id} value={String(v ?? "")} maxLength={ui.max} placeholder={ui.placeholder} onChange={(e) => set(key, e.target.value)} />
                )}
              </Field>
            );
          case "richtext":
            return (
              <Field key={key} label={ui.label} help={ui.help} error={err}>
                <RichTextEditor value={(v as never) ?? null} onChange={(d) => set(key, d)} label={ui.label} />
              </Field>
            );
          case "media":
            return (
              <Field key={key} label={ui.label} help={ui.help} error={err}>
                <MediaPicker value={(v as string) ?? null} onChange={(id) => set(key, id)} accept={ui.accept} label={ui.label} />
              </Field>
            );
          case "link": {
            const l = (v as { label: string; href: string }) ?? { label: "", href: "" };
            return (
              <Field key={key} label={ui.label} help={ui.help ?? "Path like /work, a full URL, or mailto:"} error={err}>
                <div className="grid grid-cols-2 gap-2">
                  <Input aria-label={`${ui.label} label`} placeholder="Label" value={l.label} onChange={(e) => set(key, { ...l, label: e.target.value })} />
                  <Input aria-label={`${ui.label} link`} placeholder="/path or https://" value={l.href} onChange={(e) => set(key, { ...l, href: e.target.value })} />
                </div>
              </Field>
            );
          }
          case "select":
            return (
              <Field key={key} label={ui.label} help={ui.help} error={err} htmlFor={id}>
                <Select id={id} value={String(v ?? "")} onChange={(e) => set(key, e.target.value)}>
                  {ui.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </Field>
            );
          case "boolean":
            return <Toggle key={key} id={id} checked={!!v} onChange={(b) => set(key, b)} label={ui.label} help={ui.help} />;
          case "number":
            return (
              <Field key={key} label={ui.label} help={ui.help} error={err} htmlFor={id}>
                <Input id={id} type="number" min={ui.min} max={ui.max} value={Number(v ?? 0)} onChange={(e) => set(key, e.target.value === "" ? 0 : Number(e.target.value))} className="w-32" />
              </Field>
            );
          case "refs":
            return (
              <Field key={key} label={ui.label} help={ui.help} error={err}>
                <RefPicker entity={ui.entity} value={(v as string[]) ?? []} onChange={(x) => set(key, x)} max={ui.max} />
              </Field>
            );
          case "strings":
            return (
              <Field key={key} label={ui.label} help={ui.help} error={err}>
                <StringList value={(v as string[]) ?? []} onChange={(x) => set(key, x)} max={ui.max} />
              </Field>
            );
          case "list":
            return <ListEditor key={key} label={ui.label} help={ui.help} itemLabel={ui.itemLabel ?? "Item"} fields={ui.fields} max={ui.max} value={(v as Data[]) ?? []} onChange={(x) => set(key, x)} errors={errors} path={`${path}${key}.`} />;
        }
      })}
    </div>
  );
}

function ListEditor({ label, help, itemLabel, fields, max = 60, value, onChange, errors, path }: { label: string; help?: string; itemLabel: string; fields: Fields; max?: number; value: Data[]; onChange: (v: Data[]) => void; errors: Record<string, string>; path: string }) {
  const [open, setOpen] = useState<number | null>(value.length ? null : null);
  const titleOf = (it: Data, i: number) => {
    const first = Object.entries(fields).find(([, d]) => d.ui.kind === "text");
    const t = first ? String(it[first[0]] ?? "") : "";
    return t.trim() || `${itemLabel} ${i + 1}`;
  };
  const move = (i: number, d: number) => {
    const n = [...value];
    const [x] = n.splice(i, 1);
    n.splice(i + d, 0, x);
    onChange(n);
  };
  return (
    <Field label={`${label} (${value.length}${max ? `/${max}` : ""})`} help={help}>
      <ul className="flex flex-col gap-1.5">
        {value.map((it, i) => (
          <li key={i} className="rounded-md border border-zinc-200 bg-zinc-50/50">
            <div className="flex items-center gap-1 px-2 py-1.5">
              <button type="button" className="flex flex-1 items-center gap-1.5 text-left text-sm text-zinc-800" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
                {open === i ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                <span className="truncate">{titleOf(it, i)}</span>
              </button>
              <Button variant="ghost" size="sm" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up"><ArrowUp className="size-3.5" /></Button>
              <Button variant="ghost" size="sm" disabled={i === value.length - 1} onClick={() => move(i, 1)} aria-label="Move down"><ArrowDown className="size-3.5" /></Button>
              <Button variant="ghost" size="sm" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label={`Remove ${itemLabel}`}><Trash2 className="size-3.5" /></Button>
            </div>
            {open === i && (
              <div className="border-t border-zinc-200 bg-white p-3">
                <SectionFieldsForm fields={fields} value={it} onChange={(nv) => onChange(value.map((x, j) => (j === i ? nv : x)))} errors={errors} path={`${path}${i}.`} />
              </div>
            )}
          </li>
        ))}
      </ul>
      {value.length < max && (
        <Button
          size="sm"
          className="self-start"
          onClick={() => {
            onChange([...value, defaultsOf(fields) as Data]);
            setOpen(value.length);
          }}
        >
          <Plus className="size-3.5" /> Add {itemLabel.toLowerCase()}
        </Button>
      )}
    </Field>
  );
}
