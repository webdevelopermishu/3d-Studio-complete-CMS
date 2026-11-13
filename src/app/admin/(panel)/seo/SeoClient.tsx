"use client";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { saveSeoDefaults } from "@/server/admin/site";
import { saveRedirect, deleteRedirect } from "@/server/admin/library";
import { Badge, Button, Field, Input, Textarea } from "@/components/admin/ui";
import { MediaPicker } from "@/components/admin/MediaPicker";
import { useAction, useFeedback } from "@/components/admin/feedback";

export function SeoDefaultsForm({ initial }: { initial: { titleTemplate: string; description: string; ogImageId: string | null; twitterHandle: string } }) {
  const [v, setV] = useState(initial);
  const save = useAction(saveSeoDefaults, { success: "Defaults saved" });
  return (
    <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); save.run(v); }}>
      <Field label="Title template" htmlFor="sd-t" help="%s is replaced by the page title." error={save.fieldErrors.titleTemplate}>
        <Input id="sd-t" value={v.titleTemplate} onChange={(e) => setV({ ...v, titleTemplate: e.target.value })} />
      </Field>
      <Field label="Default description" htmlFor="sd-d" error={save.fieldErrors.description}>
        <Textarea id="sd-d" value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} />
      </Field>
      <Field label="Default share image"><MediaPicker value={v.ogImageId} onChange={(id) => setV({ ...v, ogImageId: id })} /></Field>
      <Field label="X / Twitter handle" htmlFor="sd-x" error={save.fieldErrors.twitterHandle}>
        <Input id="sd-x" value={v.twitterHandle} placeholder="@studio" onChange={(e) => setV({ ...v, twitterHandle: e.target.value })} />
      </Field>
      <Button type="submit" variant="primary" className="self-start" loading={save.pending}>Save defaults</Button>
    </form>
  );
}

type R = { id: string; source: string; destination: string; permanent: boolean; enabled: boolean; hits: number; note: string | null };

export function RedirectManager({ rows }: { rows: R[] }) {
  const [draft, setDraft] = useState({ source: "", destination: "", permanent: true });
  const save = useAction(saveRedirect, { success: "Redirect saved" });
  const del = useAction(deleteRedirect, { success: "Redirect removed" });
  const { confirm } = useFeedback();
  return (
    <div className="flex flex-col gap-4">
      <form className="grid grid-cols-[1fr_1fr_auto] items-end gap-2" onSubmit={async (e) => { e.preventDefault(); const r = await save.run({ ...draft, enabled: true }); if (r.ok) setDraft({ source: "", destination: "", permanent: true }); }}>
        <Field label="From" htmlFor="rd-s" error={save.fieldErrors.source}><Input id="rd-s" className="font-mono text-[12px]" placeholder="/old-page" value={draft.source} onChange={(e) => setDraft({ ...draft, source: e.target.value })} /></Field>
        <Field label="To" htmlFor="rd-d" error={save.fieldErrors.destination}><Input id="rd-d" className="font-mono text-[12px]" placeholder="/new-page" value={draft.destination} onChange={(e) => setDraft({ ...draft, destination: e.target.value })} /></Field>
        <Button type="submit" variant="primary" loading={save.pending}>Add</Button>
        <label className="col-span-3 flex items-center gap-1.5 text-[12px] text-zinc-600"><input type="checkbox" checked={draft.permanent} onChange={(e) => setDraft({ ...draft, permanent: e.target.checked })} /> Permanent (308). Untick for a temporary 307.</label>
      </form>
      <ul className="divide-y divide-zinc-100 rounded-md border border-zinc-200">
        {rows.length === 0 && <li className="p-3 text-sm text-zinc-500">No redirects.</li>}
        {rows.map((r) => (
          <li key={r.id} className="flex items-center gap-2 px-3 py-2 text-[13px]">
            <span className="min-w-0 flex-1 truncate font-mono text-[12px]">{r.source} → {r.destination}</span>
            <Badge tone={r.permanent ? "indigo" : "zinc"}>{r.permanent ? "308" : "307"}</Badge>
            <span className="w-14 text-right tabular-nums text-[12px] text-zinc-500" title="Hits">{r.hits} hits</span>
            <button type="button" className="text-[12px] text-zinc-600 underline" onClick={() => save.run({ ...r, note: r.note, enabled: !r.enabled })}>{r.enabled ? "Disable" : "Enable"}</button>
            <Button size="sm" variant="ghost" aria-label={`Delete redirect ${r.source}`} onClick={async () => (await confirm({ title: "Delete this redirect?", confirm: "Delete", danger: true })) && del.run({ id: r.id })}><Trash2 className="size-3.5" /></Button>
          </li>
        ))}
      </ul>
      <p className="text-[12px] text-zinc-500">Changes take effect within 30 seconds on each server instance.</p>
    </div>
  );
}
