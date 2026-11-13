"use client";
import { useEffect, useState } from "react";
import { History, ExternalLink, Eye, Send, Undo2, Trash2, X } from "lucide-react";
import { publish, unpublish, softDelete, previewLink, listRevisions, restoreRevision } from "@/server/admin/content";
import { lintEntry, effectiveTitle } from "@/lib/seo/lint";
import { Badge, Button, Card, Field, Input, Select, StatusBadge, Textarea, Toggle } from "./ui";
import { MediaPicker } from "./MediaPicker";
import { useAction, useFeedback } from "./feedback";
import { useRouter } from "next/navigation";

export type SeoValue = {
  title: string | null; description: string | null; canonical: string | null; ogTitle: string | null; ogDescription: string | null;
  ogImageId: string | null; twitterCard: string; robotsIndex: boolean; robotsFollow: boolean; focusKeyword: string | null; inSitemap: boolean;
};
export const emptySeo: SeoValue = { title: null, description: null, canonical: null, ogTitle: null, ogDescription: null, ogImageId: null, twitterCard: "summary_large_image", robotsIndex: true, robotsFollow: true, focusKeyword: null, inSitemap: true };

/** Per-entity SEO editor with live search-result preview and checks. */
export function SeoPanel({ value, onChange, fallbackTitle, fallbackDescription, path, titleTemplate, errors = {} }: { value: SeoValue; onChange: (v: SeoValue) => void; fallbackTitle: string; fallbackDescription?: string | null; path: string; titleTemplate?: string; errors?: Record<string, string> }) {
  const set = <K extends keyof SeoValue>(k: K, v: SeoValue[K]) => onChange({ ...value, [k]: v });
  const title = effectiveTitle({ seoTitle: value.title, title: fallbackTitle, titleTemplate });
  const desc = value.description || fallbackDescription || "";
  const issues = lintEntry({ title: fallbackTitle, seoTitle: value.title, description: desc, focusKeyword: value.focusKeyword, robotsIndex: value.robotsIndex, inSitemap: value.inSitemap, hasOgImage: !!value.ogImageId, slug: path, titleTemplate });
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
  return (
    <Card title="Search & social" description="Leave fields empty to use sensible fallbacks from the content.">
      <div className="mb-5 rounded-md border border-zinc-200 bg-zinc-50 p-4">
        <p className="truncate text-[12px] text-zinc-600">{site}{path}</p>
        <p className="mt-0.5 truncate text-[17px] text-[#1a0dab]">{title}</p>
        <p className="mt-0.5 line-clamp-2 text-[13px] text-zinc-600">{desc || <span className="italic text-zinc-400">No description</span>}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label={`SEO title (${title.length}/60)`} error={errors["seo.title"]} htmlFor="seo-title" className="md:col-span-2">
          <Input id="seo-title" value={value.title ?? ""} placeholder={title} onChange={(e) => set("title", e.target.value || null)} />
        </Field>
        <Field label={`Meta description (${desc.length}/155)`} error={errors["seo.description"]} htmlFor="seo-desc" className="md:col-span-2">
          <Textarea id="seo-desc" value={value.description ?? ""} placeholder={fallbackDescription ?? ""} onChange={(e) => set("description", e.target.value || null)} />
        </Field>
        <Field label="Focus keyword" htmlFor="seo-kw" help="Used for the checks below.">
          <Input id="seo-kw" value={value.focusKeyword ?? ""} onChange={(e) => set("focusKeyword", e.target.value || null)} />
        </Field>
        <Field label="Canonical URL" htmlFor="seo-can" error={errors["seo.canonical"]} help="Only if this content lives elsewhere.">
          <Input id="seo-can" value={value.canonical ?? ""} placeholder="https://…" onChange={(e) => set("canonical", e.target.value || null)} />
        </Field>
        <Field label="Social title" htmlFor="seo-ogt">
          <Input id="seo-ogt" value={value.ogTitle ?? ""} placeholder={title} onChange={(e) => set("ogTitle", e.target.value || null)} />
        </Field>
        <Field label="Twitter card" htmlFor="seo-tw">
          <Select id="seo-tw" value={value.twitterCard} onChange={(e) => set("twitterCard", e.target.value)}>
            <option value="summary_large_image">Large image</option>
            <option value="summary">Summary</option>
          </Select>
        </Field>
        <Field label="Social description" htmlFor="seo-ogd" className="md:col-span-2">
          <Textarea id="seo-ogd" rows={2} value={value.ogDescription ?? ""} placeholder={desc} onChange={(e) => set("ogDescription", e.target.value || null)} />
        </Field>
        <Field label="Social share image (1200×630)" help="Falls back to the cover image, then the site default." className="md:col-span-2">
          <MediaPicker value={value.ogImageId} onChange={(id) => set("ogImageId", id)} />
        </Field>
        <Toggle checked={value.robotsIndex} onChange={(v) => set("robotsIndex", v)} label="Allow search engines to index" />
        <Toggle checked={value.robotsFollow} onChange={(v) => set("robotsFollow", v)} label="Allow following links" />
        <Toggle checked={value.inSitemap} onChange={(v) => set("inSitemap", v)} label="Include in sitemap.xml" />
      </div>
      {issues.length > 0 && (
        <ul className="mt-5 flex flex-col gap-1.5 border-t border-zinc-100 pt-4">
          {issues.map((i) => (
            <li key={i.code} className="flex items-start gap-2 text-[13px]">
              <Badge tone={i.severity === "error" ? "red" : i.severity === "warning" ? "amber" : "blue"}>{i.severity}</Badge>
              <span className="text-zinc-700">{i.message}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

type Kind = "page" | "project" | "service" | "article";

/** Status + Preview / Publish / Unpublish / Revisions / Delete actions for an entity. */
export function PublishBar({ kind, id, status, dirty, publicPath, canPublish, canDelete, deletable = true, onSave, saving }: { kind: Kind; id: string; status: string; dirty?: boolean; publicPath: string; canPublish: boolean; canDelete: boolean; deletable?: boolean; onSave?: () => void; saving?: boolean }) {
  const pub = useAction(publish, { success: "Published" });
  const unpub = useAction(unpublish, { success: "Unpublished" });
  const del = useAction(softDelete, { success: "Deleted", refresh: false });
  const { confirm, toast } = useFeedback();
  const router = useRouter();
  const [revOpen, setRevOpen] = useState(false);
  const openPreview = async () => {
    const res = await previewLink({ kind, id });
    if (res.ok && res.data) window.open(res.data, "_blank", "noopener");
    else if (!res.ok) toast({ tone: "error", text: res.error });
  };
  return (
    <div className="sticky top-0 z-30 -mx-6 mb-6 flex flex-wrap items-center gap-2 border-b border-zinc-200 bg-white/90 px-6 py-3 backdrop-blur">
      <StatusBadge status={status} dirty={dirty} />
      <span className="flex-1" />
      {status === "PUBLISHED" && (
        <a className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm text-zinc-700 hover:bg-zinc-100" href={publicPath} target="_blank" rel="noopener">
          <ExternalLink className="size-4" /> View
        </a>
      )}
      <Button variant="ghost" onClick={openPreview}>
        <Eye className="size-4" /> Preview draft
      </Button>
      <Button variant="ghost" onClick={() => setRevOpen(true)}>
        <History className="size-4" /> History
      </Button>
      {canDelete && deletable && (
        <Button
          variant="ghost"
          onClick={async () => {
            if (await confirm({ title: "Delete this item?", body: "It disappears from the site immediately and its URL is freed. Revisions are kept.", confirm: "Delete", danger: true })) {
              const r = await del.run({ kind, id });
              if (r.ok) router.push(`/admin/${kind === "page" ? "pages" : kind === "project" ? "projects" : kind === "service" ? "services" : "articles"}`);
            }
          }}
        >
          <Trash2 className="size-4 text-red-600" />
        </Button>
      )}
      {onSave && (
        <Button onClick={onSave} loading={saving}>
          Save
        </Button>
      )}
      {canPublish && status === "PUBLISHED" && (
        <Button variant="secondary" loading={unpub.pending} onClick={async () => (await confirm({ title: "Unpublish?", body: "The page returns a 404 until published again.", confirm: "Unpublish" })) && unpub.run({ kind, id })}>
          <Undo2 className="size-4" /> Unpublish
        </Button>
      )}
      {canPublish && (
        <Button variant="primary" loading={pub.pending} onClick={() => pub.run({ kind, id })} disabled={status === "PUBLISHED" && !dirty && kind !== "article"}>
          <Send className="size-4" /> {status === "PUBLISHED" ? (kind === "article" ? "Republish" : "Publish changes") : "Publish"}
        </Button>
      )}
      {revOpen && <RevisionsDrawer kind={kind} id={id} onClose={() => setRevOpen(false)} />}
    </div>
  );
}

function RevisionsDrawer({ kind, id, onClose }: { kind: Kind; id: string; onClose: () => void }) {
  const [items, setItems] = useState<{ id: string; note: string | null; createdAt: Date; author: { name: string } | null }[] | null>(null);
  const restore = useAction(restoreRevision, { success: "Revision restored to the draft" });
  const { confirm } = useFeedback();
  useEffect(() => {
    listRevisions({ kind, id }).then(setItems);
  }, [kind, id]);
  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-zinc-900/30" onClick={onClose}>
      <aside role="dialog" aria-modal="true" aria-label="Revision history" className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
          <h2 className="text-base font-semibold">Revision history</h2>
          <Button variant="ghost" onClick={onClose} aria-label="Close"><X className="size-4" /></Button>
        </header>
        <ul className="flex-1 divide-y divide-zinc-100 overflow-y-auto">
          {items === null && <li className="p-5 text-sm text-zinc-500">Loading…</li>}
          {items?.length === 0 && <li className="p-5 text-sm text-zinc-500">No revisions yet. One is saved each time you publish.</li>}
          {items?.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <div>
                <p className="text-sm text-zinc-900">{r.note ?? "Snapshot"}</p>
                <p className="text-[12px] text-zinc-500">{new Date(r.createdAt).toLocaleString()} · {r.author?.name ?? "System"}</p>
              </div>
              <Button size="sm" loading={restore.pending} onClick={async () => (await confirm({ title: "Restore this revision?", body: "Content and sections return to this version in the draft. The current state is saved as a revision first. Nothing is published.", confirm: "Restore" })) && restore.run({ revisionId: r.id }).then((x) => x.ok && onClose())}>
                Restore
              </Button>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
