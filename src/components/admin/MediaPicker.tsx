"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ImageIcon, Film, Upload, X, Search } from "lucide-react";
import { listMedia, getMediaDetail } from "@/server/admin/library";
import { imageUrl } from "@/lib/media/url";
import { cn } from "@/lib/utils";
import { Button, Input } from "./ui";
import { useFeedback } from "./feedback";

type Item = { id: string; kind: "IMAGE" | "VIDEO"; url: string; filename: string; alt: string; width: number | null; height: number | null; poster?: { url: string } | null };
const cache = new Map<string, Item>();

export function thumbOf(m: Pick<Item, "kind" | "url" | "poster">, w = 384) {
  if (m.kind === "VIDEO") return m.poster ? imageUrl(m.poster.url, w) : null;
  return imageUrl(m.url, w);
}

/** Upload files to the media library. Returns created items. */
export async function uploadFiles(files: FileList | File[], extra: Record<string, string> = {}) {
  const fd = new FormData();
  [...files].forEach((f) => fd.append("file", f));
  Object.entries(extra).forEach(([k, v]) => fd.append(k, v));
  const res = await fetch("/api/admin/media", { method: "POST", body: fd });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Upload failed");
  return json.items as { id: string; url: string; kind: "IMAGE" | "VIDEO"; filename: string }[];
}

export function MediaPicker({
  value,
  onChange,
  accept = "image",
  label = "Choose media",
  compact,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
  accept?: "image" | "video" | "any";
  label?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<Item | null>(value ? cache.get(value) ?? null : null);

  useEffect(() => {
    if (!value) return setCurrent(null);
    if (cache.has(value)) return setCurrent(cache.get(value)!);
    getMediaDetail(value).then((m) => {
      if (m) {
        const it = m as unknown as Item;
        cache.set(value, it);
        setCurrent(it);
      }
    });
  }, [value]);

  const thumb = current ? thumbOf(current) : null;
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn("relative grid shrink-0 place-items-center overflow-hidden rounded-md border border-zinc-300 bg-zinc-100 text-zinc-400 hover:border-zinc-500", compact ? "size-14" : "h-20 w-32")}
        aria-label={current ? `Change ${label.toLowerCase()} (${current.filename})` : label}
      >
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" className="absolute inset-0 size-full object-cover" />
        ) : current?.kind === "VIDEO" ? (
          <Film className="size-5" />
        ) : (
          <ImageIcon className="size-5" />
        )}
        {current?.kind === "VIDEO" && <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 text-[10px] text-white">VIDEO</span>}
      </button>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="truncate text-[13px] text-zinc-700">{current ? current.filename : <span className="text-zinc-400">Nothing selected</span>}</span>
        {current && !current.alt && current.kind === "IMAGE" && <span className="text-[11px] text-amber-700">Missing alt text</span>}
        <div className="flex gap-1">
          <Button size="sm" onClick={() => setOpen(true)}>
            {current ? "Change" : "Select"}
          </Button>
          {current && (
            <Button size="sm" variant="ghost" onClick={() => onChange(null)}>
              Remove
            </Button>
          )}
        </div>
      </div>
      {open && (
        <MediaDialog
          accept={accept}
          onClose={() => setOpen(false)}
          onPick={(it) => {
            cache.set(it.id, it);
            setCurrent(it);
            onChange(it.id);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}

function MediaDialog({ accept, onClose, onPick }: { accept: "image" | "video" | "any"; onClose: () => void; onPick: (it: Item) => void }) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useFeedback();
  const kind = accept === "image" ? "IMAGE" : accept === "video" ? "VIDEO" : "ALL";

  const load = useCallback(
    async (p = 1, query = q) => {
      setLoading(true);
      const res = await listMedia({ q: query || undefined, kind, page: p });
      setItems((prev) => (p === 1 ? (res.items as Item[]) : [...prev, ...(res.items as Item[])]));
      setPage(res.page);
      setPages(res.pages);
      setLoading(false);
    },
    [kind, q],
  );
  useEffect(() => {
    const t = setTimeout(() => load(1, q), 220);
    return () => clearTimeout(t);
  }, [q, load]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const created = await uploadFiles(files);
      toast({ tone: "success", text: `Uploaded ${created.length} file(s)` });
      await load(1, "");
    } catch (e) {
      toast({ tone: "error", text: (e as Error).message });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-zinc-900/50 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Media library" className="flex max-h-[85vh] w-full max-w-4xl flex-col rounded-lg bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center gap-3 border-b border-zinc-200 p-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-zinc-400" />
            <Input autoFocus placeholder="Search by name, title or alt text" value={q} onChange={(e) => setQ(e.target.value)} className="pl-8" />
          </div>
          <input ref={fileRef} type="file" multiple hidden accept={accept === "image" ? "image/*" : accept === "video" ? "video/*" : "image/*,video/*"} onChange={(e) => upload(e.target.files)} />
          <Button variant="primary" onClick={() => fileRef.current?.click()} loading={uploading}>
            <Upload className="size-4" /> Upload
          </Button>
          <Button variant="ghost" onClick={onClose} aria-label="Close">
            <X className="size-4" />
          </Button>
        </header>
        <div
          className="grid flex-1 grid-cols-3 gap-2 overflow-y-auto p-3 sm:grid-cols-4 md:grid-cols-6"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            upload(e.dataTransfer.files);
          }}
        >
          {items.map((it) => {
            const t = thumbOf(it, 384);
            return (
              <button key={it.id} type="button" onClick={() => onPick(it)} className="group relative aspect-square overflow-hidden rounded border border-zinc-200 bg-zinc-100 text-left focus-visible:outline-2 focus-visible:outline-indigo-600" title={it.filename}>
                {t ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t} alt={it.alt} loading="lazy" className="size-full object-cover transition group-hover:scale-105" />
                ) : (
                  <span className="grid size-full place-items-center text-zinc-400">
                    <Film className="size-5" />
                  </span>
                )}
                {it.kind === "VIDEO" && <span className="absolute left-1 top-1 rounded bg-black/70 px-1 text-[10px] text-white">VIDEO</span>}
                <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-1 pt-4 text-[10px] text-white">{it.filename}</span>
              </button>
            );
          })}
          {!loading && items.length === 0 && <p className="col-span-full py-10 text-center text-sm text-zinc-500">No media yet. Drop files here or use Upload.</p>}
        </div>
        <footer className="flex items-center justify-between border-t border-zinc-200 px-3 py-2 text-[12px] text-zinc-500">
          <span>Drag files onto the grid to upload. Max 25 MB images, 200 MB videos.</span>
          {page < pages && (
            <Button size="sm" onClick={() => load(page + 1)} loading={loading}>
              Load more
            </Button>
          )}
        </footer>
      </div>
    </div>
  );
}
