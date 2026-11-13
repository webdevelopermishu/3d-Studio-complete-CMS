"use client";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { pickerOptions } from "@/server/admin/content";
import type { RefEntity } from "@/sections/fields";
import { Button, Input, Select } from "./ui";

type Opt = { id: string; label: string; meta?: string };
const optionCache = new Map<string, Promise<Opt[]>>();
function loadOptions(entity: RefEntity) {
  if (!optionCache.has(entity)) optionCache.set(entity, pickerOptions(entity));
  return optionCache.get(entity)!;
}

/** Ordered multi-select of projects / services / articles. */
export function RefPicker({ entity, value, onChange, max = 50 }: { entity: RefEntity; value: string[]; onChange: (v: string[]) => void; max?: number }) {
  const [opts, setOpts] = useState<Opt[]>([]);
  const [pick, setPick] = useState("");
  useEffect(() => {
    loadOptions(entity).then(setOpts);
  }, [entity]);
  const byId = new Map(opts.map((o) => [o.id, o]));
  const move = (i: number, d: number) => {
    const next = [...value];
    const [x] = next.splice(i, 1);
    next.splice(i + d, 0, x);
    onChange(next);
  };
  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 && (
        <ul className="divide-y divide-zinc-100 rounded-md border border-zinc-200">
          {value.map((id, i) => (
            <li key={id} className="flex items-center gap-2 px-2.5 py-1.5 text-sm">
              <span className="flex-1 truncate">{byId.get(id)?.label ?? <span className="text-zinc-400">Missing item</span>}</span>
              {byId.get(id)?.meta && <span className="text-[11px] text-zinc-400">{byId.get(id)!.meta}</span>}
              <button type="button" className="p-1 text-zinc-400 hover:text-zinc-900 disabled:opacity-30" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">
                <ArrowUp className="size-3.5" />
              </button>
              <button type="button" className="p-1 text-zinc-400 hover:text-zinc-900 disabled:opacity-30" disabled={i === value.length - 1} onClick={() => move(i, 1)} aria-label="Move down">
                <ArrowDown className="size-3.5" />
              </button>
              <button type="button" className="p-1 text-zinc-400 hover:text-red-700" onClick={() => onChange(value.filter((v) => v !== id))} aria-label="Remove">
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {value.length < max && (
        <div className="flex gap-2">
          <Select value={pick} onChange={(e) => setPick(e.target.value)} aria-label={`Add ${entity}`}>
            <option value="">Add {entity}…</option>
            {opts
              .filter((o) => !value.includes(o.id))
              .map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                  {o.meta ? ` — ${o.meta}` : ""}
                </option>
              ))}
          </Select>
          <Button
            disabled={!pick}
            onClick={() => {
              onChange([...value, pick]);
              setPick("");
            }}
          >
            <Plus className="size-4" /> Add
          </Button>
        </div>
      )}
    </div>
  );
}

/** Editable list of short strings (offerings, statements, options). */
export function StringList({ value, onChange, placeholder, max = 60 }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string; max?: number }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    onChange([...value, v]);
    setDraft("");
  };
  return (
    <div className="flex flex-col gap-2">
      {value.map((s, i) => (
        <div key={i} className="flex gap-1.5">
          <Input value={s} onChange={(e) => onChange(value.map((x, j) => (j === i ? e.target.value : x)))} aria-label={`Item ${i + 1}`} />
          <Button variant="ghost" size="sm" disabled={i === 0} onClick={() => { const n = [...value]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; onChange(n); }} aria-label="Move up">
            <ArrowUp className="size-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Remove">
            <X className="size-3.5" />
          </Button>
        </div>
      ))}
      {value.length < max && (
        <div className="flex gap-1.5">
          <Input
            value={draft}
            placeholder={placeholder ?? "Add an item and press Enter"}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
          />
          <Button onClick={add} disabled={!draft.trim()}>
            <Plus className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
