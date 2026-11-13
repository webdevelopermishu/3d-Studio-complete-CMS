"use client";
import { useEffect, useMemo, useState } from "react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Eye, EyeOff, Copy, Trash2, Pencil, Plus, BookmarkPlus, X, AlertTriangle } from "lucide-react";
import { sections as REG, getSectionDef, parseSectionData, SECTION_TYPES, type SectionCategory } from "@/sections/registry";
import type { FieldDef } from "@/sections/fields";
import { addSection, updateSection, reorderSections, toggleSection, duplicateSection, deleteSection, saveSectionAsTemplate, listTemplates } from "@/server/admin/sections";
import { cn } from "@/lib/utils";
import { Badge, Button, Input } from "./ui";
import { useAction, useFeedback } from "./feedback";
import { SectionFieldsForm } from "./SectionFieldsForm";

type Row = { id: string; type: string; enabled: boolean; data: unknown; label: string | null };
type Owner = { type: "page" | "project" | "service"; id: string };

function summary(row: Row) {
  const d = (row.data ?? {}) as Record<string, unknown>;
  const pick = ["title", "heading", "text", "eyebrow"].map((k) => d[k]).find((v) => typeof v === "string" && v.trim());
  return (pick as string | undefined)?.replace(/\n/g, " ").slice(0, 90) ?? "";
}

/**
 * Visual section builder: drag to reorder (mouse, touch or keyboard), toggle visibility,
 * duplicate, delete, save as template, and edit content in a side panel with typed fields.
 * Every change is persisted immediately to the draft; Publish snapshots it.
 */
export function SectionsBuilder({ owner, initial, allowed }: { owner: Owner; initial: Row[]; allowed?: string[] }) {
  const [rows, setRows] = useState<Row[]>(initial);
  const [editing, setEditing] = useState<Row | null>(null);
  const [adding, setAdding] = useState<{ afterId?: string } | null>(null);
  const { confirm, toast } = useFeedback();
  useEffect(() => setRows(initial), [initial]);

  const reorder = useAction(reorderSections, { refresh: true });
  const toggle = useAction(toggleSection);
  const dup = useAction(duplicateSection, { success: "Section duplicated" });
  const del = useAction(deleteSection, { success: "Section deleted" });
  const tmpl = useAction(saveSectionAsTemplate, { success: "Saved as template", refresh: false });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const from = rows.findIndex((r) => r.id === e.active.id);
    const to = rows.findIndex((r) => r.id === e.over!.id);
    const next = arrayMove(rows, from, to);
    setRows(next);
    reorder.run({ owner, ids: next.map((r) => r.id) }).then((r) => !r.ok && setRows(rows));
  };

  return (
    <div className="flex flex-col gap-2">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
          <ol className="flex flex-col gap-2" aria-label="Sections">
            {rows.map((r, i) => (
              <SortableRow
                key={r.id}
                row={r}
                index={i}
                onEdit={() => setEditing(r)}
                onToggle={() => {
                  setRows((l) => l.map((x) => (x.id === r.id ? { ...x, enabled: !x.enabled } : x)));
                  toggle.run({ owner, id: r.id, enabled: !r.enabled });
                }}
                onDuplicate={() => dup.run({ owner, id: r.id })}
                onDelete={async () => {
                  if (await confirm({ title: "Delete this section?", body: "It's removed from the draft. The published page doesn't change until you publish again.", confirm: "Delete", danger: true })) del.run({ owner, id: r.id });
                }}
                onTemplate={async () => {
                  const name = window.prompt("Template name", `${REG[r.type as keyof typeof REG]?.label ?? r.type}`);
                  if (name) tmpl.run({ id: r.id, name });
                }}
                onAddBelow={() => setAdding({ afterId: r.id })}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
      {rows.length === 0 && <p className="rounded-md border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">No sections yet. Add the first one.</p>}
      <Button className="self-start" onClick={() => setAdding({})}>
        <Plus className="size-4" /> Add section
      </Button>
      <p className="text-[12px] text-zinc-500">Tip: focus a handle and use Space + arrow keys to reorder with the keyboard.</p>

      {adding && (
        <AddSectionDialog
          allowed={allowed}
          onClose={() => setAdding(null)}
          onPick={async (type, templateId) => {
            const res = await addSection({ owner, type, templateId, afterId: adding.afterId });
            if (res.ok && res.data) {
              const created = res.data as unknown as Row;
              setAdding(null);
              toast({ tone: "success", text: "Section added" });
              setRows((l) => {
                const idx = adding.afterId ? l.findIndex((x) => x.id === adding.afterId) + 1 : l.length;
                const n = [...l];
                n.splice(idx, 0, created);
                return n;
              });
              setEditing(created);
            } else if (!res.ok) toast({ tone: "error", text: res.error });
          }}
        />
      )}
      {editing && (
        <EditPanel
          owner={owner}
          row={editing}
          onClose={() => setEditing(null)}
          onSaved={(data, label) => {
            setRows((l) => l.map((x) => (x.id === editing.id ? { ...x, data, label } : x)));
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function SortableRow({ row, index, onEdit, onToggle, onDuplicate, onDelete, onTemplate, onAddBelow }: { row: Row; index: number; onEdit: () => void; onToggle: () => void; onDuplicate: () => void; onDelete: () => void; onTemplate: () => void; onAddBelow: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.id });
  const def = getSectionDef(row.type);
  const valid = useMemo(() => parseSectionData(row.type, row.data).ok, [row.type, row.data]);
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("group flex items-center gap-2 rounded-md border bg-white px-2 py-2", isDragging ? "z-10 border-indigo-400 shadow-lg" : "border-zinc-200", !row.enabled && "opacity-60")}
    >
      <button type="button" className="cursor-grab touch-none rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 active:cursor-grabbing" aria-label={`Reorder section ${index + 1}`} {...attributes} {...listeners}>
        <GripVertical className="size-4" />
      </button>
      <span className="w-6 text-center text-[12px] tabular-nums text-zinc-400">{index + 1}</span>
      <button type="button" onClick={onEdit} className="flex min-w-0 flex-1 flex-col text-left">
        <span className="flex items-center gap-2 text-sm font-medium text-zinc-900">
          {row.label || def?.label || row.type}
          {!def && <Badge tone="red">Unknown type</Badge>}
          {def && !valid && (
            <Badge tone="amber">
              <AlertTriangle className="mr-1 size-3" />
              Needs attention
            </Badge>
          )}
          {!row.enabled && <Badge>Hidden</Badge>}
        </span>
        <span className="truncate text-[12px] text-zinc-500">{summary(row) || def?.description}</span>
      </button>
      <div className="flex items-center opacity-70 group-hover:opacity-100">
        <Button variant="ghost" size="sm" onClick={onEdit} aria-label="Edit section" title="Edit"><Pencil className="size-3.5" /></Button>
        <Button variant="ghost" size="sm" onClick={onToggle} aria-label={row.enabled ? "Hide section" : "Show section"} title={row.enabled ? "Hide" : "Show"}>{row.enabled ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}</Button>
        <Button variant="ghost" size="sm" onClick={onDuplicate} aria-label="Duplicate section" title="Duplicate"><Copy className="size-3.5" /></Button>
        <Button variant="ghost" size="sm" onClick={onTemplate} aria-label="Save as template" title="Save as template"><BookmarkPlus className="size-3.5" /></Button>
        <Button variant="ghost" size="sm" onClick={onAddBelow} aria-label="Add section below" title="Add below"><Plus className="size-3.5" /></Button>
        <Button variant="ghost" size="sm" onClick={onDelete} aria-label="Delete section" title="Delete"><Trash2 className="size-3.5 text-red-600" /></Button>
      </div>
    </li>
  );
}

function AddSectionDialog({ onClose, onPick, allowed }: { onClose: () => void; onPick: (type: string, templateId?: string) => void; allowed?: string[] }) {
  const [templates, setTemplates] = useState<{ id: string; name: string; type: string }[]>([]);
  const [q, setQ] = useState("");
  useEffect(() => {
    listTemplates().then(setTemplates).catch(() => {});
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const types = SECTION_TYPES.filter((t) => !allowed || allowed.includes(t)).filter((t) => !q || `${REG[t].label} ${REG[t].description}`.toLowerCase().includes(q.toLowerCase()));
  const groups = types.reduce<Record<string, typeof types>>((acc, t) => ((acc[REG[t].category] ??= []).push(t), acc), {});
  const order: SectionCategory[] = ["Hero", "Story", "Portfolio", "Media", "Lists", "Call to action", "Forms", "Text"];
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-zinc-900/40 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Add section" className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-lg bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center gap-3 border-b border-zinc-200 p-3">
          <Input autoFocus placeholder="Search sections" value={q} onChange={(e) => setQ(e.target.value)} />
          <Button variant="ghost" onClick={onClose} aria-label="Close"><X className="size-4" /></Button>
        </header>
        <div className="overflow-y-auto p-4">
          {templates.length > 0 && !q && (
            <div className="mb-5">
              <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-zinc-500">Saved templates</h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {templates.map((t) => (
                  <button key={t.id} type="button" onClick={() => onPick(t.type, t.id)} className="rounded-md border border-indigo-200 bg-indigo-50/50 p-3 text-left hover:border-indigo-400">
                    <span className="block text-sm font-medium text-zinc-900">{t.name}</span>
                    <span className="text-[12px] text-zinc-500">{REG[t.type as keyof typeof REG]?.label ?? t.type}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {order.filter((c) => groups[c]).map((cat) => (
            <div key={cat} className="mb-5">
              <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-zinc-500">{cat}</h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {groups[cat].map((t) => (
                  <button key={t} type="button" onClick={() => onPick(t)} className="rounded-md border border-zinc-200 p-3 text-left hover:border-zinc-500">
                    <span className="block text-sm font-medium text-zinc-900">{REG[t].label}</span>
                    <span className="text-[12px] leading-snug text-zinc-500">{REG[t].description}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EditPanel({ owner, row, onClose, onSaved }: { owner: Owner; row: Row; onClose: () => void; onSaved: (data: unknown, label: string | null) => void }) {
  const def = getSectionDef(row.type);
  const parsed = parseSectionData(row.type, row.data);
  const [data, setData] = useState<Record<string, unknown>>(parsed.ok ? parsed.data : ((row.data as Record<string, unknown>) ?? {}));
  const [label, setLabel] = useState(row.label ?? "");
  const [dirty, setDirty] = useState(false);
  const save = useAction(updateSection, { success: "Section saved" });
  const { confirm } = useFeedback();
  const close = async () => {
    if (dirty && !(await confirm({ title: "Discard unsaved changes?", confirm: "Discard", danger: true }))) return;
    onClose();
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        doSave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  const doSave = async () => {
    const res = await save.run({ owner, id: row.id, data, label: label || null });
    if (res.ok) onSaved(res.data ?? data, label || null);
  };
  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-zinc-900/30" onClick={close}>
      <aside role="dialog" aria-modal="true" aria-label={`Edit ${def?.label ?? row.type}`} className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-start justify-between gap-3 border-b border-zinc-200 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">{def?.label ?? row.type}</h2>
            <p className="text-[12px] text-zinc-500">{def?.description}</p>
          </div>
          <Button variant="ghost" onClick={close} aria-label="Close"><X className="size-4" /></Button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {!def ? (
            <p className="text-sm text-red-700">This section type isn&apos;t registered. It will be skipped on the site. Delete it or re-add a supported section.</p>
          ) : (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-zinc-800" htmlFor="section-label">Admin label <span className="font-normal text-zinc-400">(optional, only shown here)</span></label>
                <Input id="section-label" value={label} onChange={(e) => { setLabel(e.target.value); setDirty(true); }} placeholder={def.label} />
              </div>
              {!parsed.ok && <p className="rounded-md bg-amber-50 p-3 text-[13px] text-amber-800">Some stored values were invalid and have been reset to defaults: {parsed.error}</p>}
              <SectionFieldsForm fields={def.fields as Record<string, FieldDef<unknown>>} value={data} onChange={(v) => { setData(v); setDirty(true); }} errors={save.fieldErrors} />
            </div>
          )}
        </div>
        <footer className="flex items-center justify-between gap-2 border-t border-zinc-200 px-5 py-3">
          <span className="text-[12px] text-zinc-500">Saves to the draft. Publish to make it live. ⌘/Ctrl+S</span>
          <div className="flex gap-2">
            <Button onClick={close}>Cancel</Button>
            <Button variant="primary" onClick={doSave} loading={save.pending} disabled={!def}>Save section</Button>
          </div>
        </footer>
      </aside>
    </div>
  );
}
