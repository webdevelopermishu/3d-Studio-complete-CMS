"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveArticle } from "@/server/admin/content";
import { slugify } from "@/lib/utils";
import { Button, Card, Field, Input, PageHeader, Textarea } from "@/components/admin/ui";
import { useAction } from "@/components/admin/feedback";
import { MediaPicker } from "@/components/admin/MediaPicker";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { PublishBar, SeoPanel, emptySeo, type SeoValue } from "@/components/admin/content-common";

type Doc = { type: "doc"; content?: unknown[] } | null;
type A = { id: string; title: string; slug: string; excerpt: string | null; body: Doc; coverId: string | null; serviceIds: string[]; publishedAt: string | null; status: string };

const toLocal = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");

export function ArticleEditor({ article, services, seo: seo0, titleTemplate, perms }: { article: A | null; services: { id: string; title: string }[]; seo: SeoValue; titleTemplate?: string; perms: { write: boolean; publish: boolean; del: boolean } }) {
  const [f, setF] = useState<Omit<A, "id" | "status">>(article ?? { title: "", slug: "", excerpt: null, body: null, coverId: null, serviceIds: [], publishedAt: null });
  const [seo, setSeo] = useState<SeoValue>(article ? seo0 : emptySeo);
  const [slugTouched, setSlugTouched] = useState(!!article);
  const router = useRouter();
  const save = useAction(saveArticle, { success: article ? "Article saved" : "Article created", refresh: !!article });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const doSave = async () => {
    const r = await save.run({ ...(article ? { id: article.id } : {}), ...f, seo });
    if (r.ok && !article && r.data) router.push(`/admin/articles/${(r.data as { id: string }).id}`);
  };
  const path = `/newsroom/${f.slug}`;
  const e = save.fieldErrors;
  return (
    <>
      <PageHeader title={f.title || "New article"} back={{ href: "/admin/articles", label: "Newsroom" }} description={<span className="font-mono text-[12px]">{path}</span>} />
      {article ? (
        <PublishBar kind="article" id={article.id} status={article.status} publicPath={path} canPublish={perms.publish} canDelete={perms.del} onSave={perms.write ? doSave : undefined} saving={save.pending} />
      ) : (
        <div className="mb-6 flex justify-end"><Button variant="primary" onClick={doSave} loading={save.pending}>Create article</Button></div>
      )}
      {article?.status === "PUBLISHED" && <p className="mb-4 rounded-md bg-sky-50 px-4 py-2.5 text-[13px] text-sky-800">This article is live — saved edits appear on the site immediately.</p>}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-6">
          <Card>
            <div className="flex flex-col gap-4">
              <Field label="Title" htmlFor="ar-title" error={e.title}>
                <Input id="ar-title" value={f.title} onChange={(ev) => { set("title", ev.target.value); if (!slugTouched) set("slug", slugify(ev.target.value)); }} className="h-11 text-base" />
              </Field>
              <Field label="Excerpt" htmlFor="ar-ex" help="Shown under the title and in lists; default meta description.">
                <Textarea id="ar-ex" value={f.excerpt ?? ""} rows={2} onChange={(ev) => set("excerpt", ev.target.value || null)} />
              </Field>
              <Field label="Body">
                <RichTextEditor value={f.body} onChange={(d) => set("body", d)} label="Article body" />
              </Field>
            </div>
          </Card>
        </div>
        <div className="flex flex-col gap-6">
          <Card title="Details">
            <div className="flex flex-col gap-4">
              <Field label="Slug" htmlFor="ar-slug" error={e.slug}>
                <Input id="ar-slug" className="font-mono" value={f.slug} onChange={(ev) => { setSlugTouched(true); set("slug", ev.target.value); }} />
              </Field>
              <Field label="Publish date" htmlFor="ar-date" help="Future dates schedule the article (it stays hidden until then).">
                <Input id="ar-date" type="datetime-local" value={toLocal(f.publishedAt)} onChange={(ev) => set("publishedAt", ev.target.value ? new Date(ev.target.value).toISOString() : null)} />
              </Field>
              <Field label="Cover image"><MediaPicker value={f.coverId} onChange={(v) => set("coverId", v)} /></Field>
              <fieldset>
                <legend className="mb-1.5 text-[13px] font-medium text-zinc-800">Related services</legend>
                <div className="flex flex-wrap gap-1.5">
                  {services.map((s) => {
                    const on = f.serviceIds.includes(s.id);
                    return (
                      <button key={s.id} type="button" aria-pressed={on} onClick={() => set("serviceIds", on ? f.serviceIds.filter((x) => x !== s.id) : [...f.serviceIds, s.id])} className={`rounded-full border px-2.5 py-1 text-[12px] ${on ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white"}`}>
                        {s.title}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            </div>
          </Card>
          <SeoPanel value={seo} onChange={setSeo} fallbackTitle={f.title} fallbackDescription={f.excerpt} path={path} titleTemplate={titleTemplate} errors={e} />
        </div>
      </div>
    </>
  );
}
