"use client";
import { useState } from "react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { saveMenu } from "@/server/admin/library";
import { Button, Card, Input } from "@/components/admin/ui";
import { useAction } from "@/components/admin/feedback";

type Item = { id: string; label: string; href: string; newTab: boolean; enabled: boolean };
let tmp = 0;

export function MenuEditor({ menuId, name, help, initial }: { menuId: string; name: string; help?: string; initial: Item[] }) {
  const [items, setItems] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const save = useAction(saveMenu, { success: `${name} saved` });
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const update = (next: Item[]) => {
    setItems(next);
    setDirty(true);
  };
  return (
    <Card title={name} description={help} actions={<Button size="sm" variant="primary" disabled={!dirty} loading={save.pending} onClick={async () => { const r = await save.run({ menuId, items: items.map(({ id, ...rest }) => ({ ...rest, id: id.startsWith("tmp") ? undefined : id })) }); if (r.ok) setDirty(false); }}>Save</Button>}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => { if (e.over && e.active.id !== e.over.id) update(arrayMove(items, items.findIndex((i) => i.id === e.active.id), items.findIndex((i) => i.id === e.over!.id))); }}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <ul className="flex flex-col gap-1.5">
            {items.map((it, idx) => (
              <Row key={it.id} item={it} error={save.fieldErrors[`items.${idx}.href`] ?? save.fieldErrors[`items.${idx}.label`]} onChange={(v) => update(items.map((x) => (x.id === it.id ? v : x)))} onDelete={() => update(items.filter((x) => x.id !== it.id))} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      <Button size="sm" className="mt-3" onClick={() => update([...items, { id: `tmp${++tmp}`, label: "", href: "/", newTab: false, enabled: true }])}><Plus className="size-3.5" /> Add link</Button>
    </Card>
  );
}

function Row({ item, onChange, onDelete, error }: { item: Item; onChange: (v: Item) => void; onDelete: () => void; error?: string }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className="rounded-md border border-zinc-200 bg-white p-1.5">
      <div className="flex items-center gap-1.5">
        <button type="button" className="cursor-grab touch-none p-1 text-zinc-400" aria-label="Reorder" {...attributes} {...listeners}><GripVertical className="size-4" /></button>
        <Input className="h-8 w-36" value={item.label} placeholder="Label" aria-label="Label" onChange={(e) => onChange({ ...item, label: e.target.value })} />
        <Input className="h-8 flex-1 font-mono text-[12px]" value={item.href} placeholder="/path or https://" aria-label="Link" onChange={(e) => onChange({ ...item, href: e.target.value })} />
        <label className="flex items-center gap-1 text-[11px] text-zinc-600" title="Open in a new tab"><input type="checkbox" checked={item.newTab} onChange={(e) => onChange({ ...item, newTab: e.target.checked })} /> New tab</label>
        <label className="flex items-center gap-1 text-[11px] text-zinc-600"><input type="checkbox" checked={item.enabled} onChange={(e) => onChange({ ...item, enabled: e.target.checked })} /> On</label>
        <Button size="sm" variant="ghost" onClick={onDelete} aria-label={`Remove ${item.label || "link"}`}><Trash2 className="size-3.5" /></Button>
      </div>
      {error && <p className="px-8 pt-1 text-[12px] text-red-700">{error}</p>}
    </li>
  );
}
