"use client";
import { useState } from "react";
import { Trash2, Plus } from "lucide-react";
import { saveTerm, deleteTerm } from "@/server/admin/library";
import { Button, Card, Input } from "@/components/admin/ui";
import { useAction, useFeedback } from "@/components/admin/feedback";

type Term = { id: string; name: string; slug: string; order: number; count: number };

export function TermList({ model, title, terms, editable }: { model: "category" | "deliverable" | "industry"; title: string; terms: Term[]; editable: boolean }) {
  const [draft, setDraft] = useState("");
  const save = useAction(saveTerm, { success: "Saved" });
  const del = useAction(deleteTerm, { success: "Deleted" });
  const { confirm } = useFeedback();
  return (
    <Card title={title} description={`${terms.length} terms`}>
      <ul className="flex flex-col gap-1.5">
        {terms.map((t) => (
          <TermRow key={t.id} term={t} editable={editable} onSave={(v) => save.run({ model, id: t.id, ...v })} onDelete={async () => {
            if (await confirm({ title: `Delete “${t.name}”?`, body: t.count ? `It's assigned to ${t.count} project(s); they'll lose this tag.` : undefined, confirm: "Delete", danger: true })) del.run({ model, id: t.id });
          }} />
        ))}
      </ul>
      {editable && (
        <form className="mt-3 flex gap-1.5" onSubmit={async (e) => { e.preventDefault(); if (!draft.trim()) return; const r = await save.run({ model, name: draft, order: terms.length }); if (r.ok) setDraft(""); }}>
          <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={`New ${title.toLowerCase()} term`} aria-label={`New ${title} term`} />
          <Button type="submit" loading={save.pending}><Plus className="size-4" /></Button>
        </form>
      )}
    </Card>
  );
}

function TermRow({ term, editable, onSave, onDelete }: { term: Term; editable: boolean; onSave: (v: { name: string; slug: string; order: number }) => void; onDelete: () => void }) {
  const [v, setV] = useState({ name: term.name, slug: term.slug, order: term.order });
  const changed = v.name !== term.name || v.slug !== term.slug || v.order !== term.order;
  return (
    <li className="flex items-center gap-1.5">
      <Input value={v.order} type="number" onChange={(e) => setV({ ...v, order: Number(e.target.value) || 0 })} className="w-14 px-2" aria-label="Order" disabled={!editable} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} aria-label="Name" disabled={!editable} className="h-8" />
        <span className="truncate px-1 font-mono text-[11px] text-zinc-400">{term.slug} · {term.count} projects</span>
      </div>
      {editable && changed && <Button size="sm" variant="primary" onClick={() => onSave(v)}>Save</Button>}
      {editable && <Button size="sm" variant="ghost" onClick={onDelete} aria-label={`Delete ${term.name}`}><Trash2 className="size-3.5" /></Button>}
    </li>
  );
}
