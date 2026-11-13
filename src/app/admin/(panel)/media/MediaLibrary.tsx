"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Upload, Film, Search, X, RefreshCw, Trash2, FolderPlus, Copy } from "lucide-react";
import { listMedia, getMediaDetail, updateMedia, deleteMedia, saveFolder } from "@/server/admin/library";
import { imageUrl } from "@/lib/media/url";
import { Badge, Button, Field, Input, Select, Textarea } from "@/components/admin/ui";
import { useAction, useFeedback } from "@/components/admin/feedback";
import { uploadFiles, thumbOf } from "@/components/admin/MediaPicker";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

type Item = Awaited<ReturnType<typeof listMedia>>["items"][number];
type Detail = NonNullable<Awaited<ReturnType<typeof getMediaDetail>>>;

export function MediaLibrary({ folders, perms }: { folders: { id: string; name: string; count: number }[]; perms: { write: boolean; del: boolean } }) {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<"ALL" | "IMAGE" | "VIDEO">("ALL");
  const [folderId, setFolderId] = useState("");
  const [missingAlt, setMissingAlt] = useState(false);
  const [data, setData] = useState<{ items: Item[]; total: number; pages: number; page: number }>({ items: [], total: 0, pages: 1, page: 1 });
  const [selected, setSelected] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useFeedback();
  const router = useRouter();

  const load = useCallback(
    async (page = 1) => {
      const res = await listMedia({ q: q || undefined, kind, folderId: folderId || undefined, missingAlt, page });
      setData((prev) => (page === 1 ? res : { ...res, items: [...prev.items, ...res.items] }));
    },
    [q, kind, folderId, missingAlt],
  );
  useEffect(() => {
    const t = setTimeout(() => load(1), 200);
    return () => clearTimeout(t);
  }, [load]);

  const upload = async (files: FileList | File[] | null) => {
    if (!files || !files.length || !perms.write) return;
    setUploading(true);
    try {
      const created = await uploadFiles(files, folderId && folderId !== "none" ? { folderId } : {});
      toast({ tone: "success", text: `Uploaded ${created.length} file(s). Add alt text so they're accessible.` });
      await load(1);
      if (created.length === 1) setSelected(created[0].id);
    } catch (e) {
      toast({ tone: "error", text: (e as Error).message });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div
        className={cn("flex flex-col gap-3 rounded-lg", dragging && "ring-2 ring-indigo-500 ring-offset-4")}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); upload(e.dataTransfer.files); }}
      >
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-56">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-zinc-400" />
            <Input placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} className="pl-8" aria-label="Search media" />
          </div>
          <div className="w-32"><Select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} aria-label="Type">
            <option value="ALL">All types</option>
            <option value="IMAGE">Images</option>
            <option value="VIDEO">Videos</option>
          </Select></div>
          <div className="w-44"><Select value={folderId} onChange={(e) => setFolderId(e.target.value)} aria-label="Folder">
            <option value="">All folders</option>
            <option value="none">No folder</option>
            {folders.map((f) => <option key={f.id} value={f.id}>{f.name} ({f.count})</option>)}
          </Select></div>
          <label className="flex items-center gap-1.5 text-[13px] text-zinc-700">
            <input type="checkbox" checked={missingAlt} onChange={(e) => setMissingAlt(e.target.checked)} /> Missing alt text
          </label>
          <span className="flex-1" />
          {perms.write && (
            <>
              <Button size="sm" variant="ghost" onClick={async () => { const name = window.prompt("Folder name"); if (name) { const r = await saveFolder({ name }); if (r.ok) router.refresh(); } }}>
                <FolderPlus className="size-4" /> Folder
              </Button>
              <input ref={fileRef} type="file" multiple hidden accept="image/*,video/mp4,video/webm,video/quicktime" onChange={(e) => upload(e.target.files)} />
              <Button variant="primary" onClick={() => fileRef.current?.click()} loading={uploading}><Upload className="size-4" /> Upload</Button>
            </>
          )}
        </div>
        <p className="text-[12px] text-zinc-500">{data.total} files · drag and drop anywhere here to upload</p>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {data.items.map((it) => {
            const t = thumbOf(it as never, 384);
            return (
              <li key={it.id}>
                <button type="button" onClick={() => setSelected(it.id)} className={cn("group relative block aspect-square w-full overflow-hidden rounded-md border bg-zinc-100", selected === it.id ? "border-indigo-600 ring-2 ring-indigo-600" : "border-zinc-200 hover:border-zinc-400")} aria-label={`${it.filename}${it.alt ? "" : " (missing alt text)"}`}>
                  {t ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t} alt="" loading="lazy" className="size-full object-cover" />
                  ) : <span className="grid size-full place-items-center text-zinc-400"><Film className="size-5" /></span>}
                  <span className="absolute left-1 top-1 flex gap-1">
                    {it.kind === "VIDEO" && <Badge tone="zinc">Video</Badge>}
                    {it.kind === "IMAGE" && !it.alt && <Badge tone="amber">No alt</Badge>}
                  </span>
                  <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-1 pt-4 text-left text-[11px] text-white">{it.filename}</span>
                </button>
              </li>
            );
          })}
        </ul>
        {data.page < data.pages && <Button className="self-center" onClick={() => load(data.page + 1)}>Load more</Button>}
      </div>
      <div className="lg:sticky lg:top-4 lg:self-start">
        {selected ? <MediaDetails id={selected} folders={folders} perms={perms} onClose={() => setSelected(null)} onChanged={() => load(1)} /> : <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">Select a file to edit its details.</p>}
      </div>
    </div>
  );
}

function MediaDetails({ id, folders, perms, onClose, onChanged }: { id: string; folders: { id: string; name: string }[]; perms: { write: boolean; del: boolean }; onClose: () => void; onChanged: () => void }) {
  const [d, setD] = useState<Detail | null>(null);
  const [form, setForm] = useState({ alt: "", title: "", description: "", folderId: "" });
  const [replacing, setReplacing] = useState(false);
  const replaceRef = useRef<HTMLInputElement>(null);
  const save = useAction(updateMedia, { success: "Details saved", refresh: false });
  const del = useAction(deleteMedia, { success: "File deleted", refresh: false });
  const { confirm, toast } = useFeedback();
  const reload = useCallback(() => getMediaDetail(id).then((m) => {
    setD(m);
    if (m) setForm({ alt: m.alt, title: m.title ?? "", description: m.description ?? "", folderId: m.folderId ?? "" });
  }), [id]);
  useEffect(() => { reload(); }, [reload]);
  if (!d) return <div className="h-64 animate-pulse rounded-lg bg-zinc-100" />;
  const preview = d.kind === "IMAGE" ? imageUrl(d.url, 828) : null;
  return (
    <aside className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-4" aria-label="File details">
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 break-all text-sm font-medium">{d.filename}</p>
        <Button size="sm" variant="ghost" onClick={onClose} aria-label="Close details"><X className="size-4" /></Button>
      </div>
      <div className="overflow-hidden rounded-md bg-zinc-100">
        {d.kind === "VIDEO" ? (
          <video src={d.url} poster={d.poster ? imageUrl(d.poster.url, 828) : undefined} controls muted className="w-full" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview!} alt={d.alt} className="w-full" />
        )}
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[12px] text-zinc-600">
        <dt>Type</dt><dd>{d.mime}</dd>
        {d.width && <><dt>Size</dt><dd>{d.width} × {d.height}</dd></>}
        {d.bytes && <><dt>File size</dt><dd>{(d.bytes / 1024 / 1024).toFixed(2)} MB</dd></>}
        {d.duration && <><dt>Duration</dt><dd>{d.duration.toFixed(1)}s</dd></>}
        <dt>Uploaded</dt><dd>{new Date(d.createdAt).toLocaleDateString()}{d.uploadedBy ? ` by ${d.uploadedBy.name}` : ""}</dd>
        <dt>Storage</dt><dd>{d.provider}</dd>
      </dl>
      <Button size="sm" variant="ghost" className="self-start" onClick={() => { navigator.clipboard.writeText(new URL(d.url, location.href).toString()); toast({ tone: "info", text: "URL copied" }); }}><Copy className="size-3.5" /> Copy URL</Button>
      <Field label="Alt text" htmlFor="m-alt" help={d.kind === "IMAGE" ? "Describe the image for screen readers and search. Leave empty only for purely decorative images." : "Accessible label for the video."}>
        <Textarea id="m-alt" rows={2} value={form.alt} onChange={(e) => setForm({ ...form, alt: e.target.value })} disabled={!perms.write} />
      </Field>
      <Field label="Title" htmlFor="m-title"><Input id="m-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} disabled={!perms.write} /></Field>
      <Field label="Description / caption" htmlFor="m-desc"><Textarea id="m-desc" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} disabled={!perms.write} /></Field>
      <Field label="Folder" htmlFor="m-folder">
        <Select id="m-folder" value={form.folderId} onChange={(e) => setForm({ ...form, folderId: e.target.value })} disabled={!perms.write}>
          <option value="">No folder</option>
          {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </Select>
      </Field>
      {d.usage.length > 0 && (
        <div>
          <p className="mb-1 text-[12px] font-medium text-zinc-700">Used in</p>
          <ul className="flex flex-col gap-0.5 text-[12px]">{d.usage.map((u, i) => <li key={i}><a href={u.href} className="text-indigo-700 hover:underline">{u.label}</a></li>)}</ul>
        </div>
      )}
      {perms.write && (
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" loading={save.pending} onClick={async () => { const r = await save.run({ id, alt: form.alt, title: form.title, description: form.description, folderId: form.folderId }); if (r.ok) onChanged(); }}>Save</Button>
          <input ref={replaceRef} type="file" hidden accept={d.kind === "IMAGE" ? "image/*" : "video/*"} onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setReplacing(true);
            try { await uploadFiles([file], { replaceId: id }); toast({ tone: "success", text: "File replaced everywhere it's used" }); await reload(); onChanged(); }
            catch (err) { toast({ tone: "error", text: (err as Error).message }); }
            finally { setReplacing(false); }
          }} />
          <Button loading={replacing} onClick={() => replaceRef.current?.click()} title="Swap the file but keep every reference"><RefreshCw className="size-4" /> Replace</Button>
          {perms.del && (
            <Button variant="danger" loading={del.pending} onClick={async () => {
              const used = d.usage.length > 0;
              if (!(await confirm({ title: "Delete this file?", body: used ? `It's used in ${d.usage.length} place(s); those spots will show an empty frame.` : "This can't be undone.", confirm: "Delete", danger: true }))) return;
              const r = await del.run({ id, force: used });
              if (r.ok) { onClose(); onChanged(); }
            }}><Trash2 className="size-4" /></Button>
          )}
        </div>
      )}
    </aside>
  );
}
