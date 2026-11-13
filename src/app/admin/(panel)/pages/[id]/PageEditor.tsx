"use client";
import { useState } from "react";
import { savePage } from "@/server/admin/content";
import { Card, Field, Input, PageHeader } from "@/components/admin/ui";
import { useAction } from "@/components/admin/feedback";
import { SectionsBuilder } from "@/components/admin/SectionsBuilder";
import { PublishBar, SeoPanel, type SeoValue } from "@/components/admin/content-common";

type Section = { id: string; type: string; enabled: boolean; data: unknown; label: string | null };

export function PageEditor({ page, sections, seo: seo0, dirty, titleTemplate, perms }: { page: { id: string; title: string; slug: string; status: string; system: boolean }; sections: Section[]; seo: SeoValue; dirty: boolean; titleTemplate?: string; perms: { write: boolean; publish: boolean; del: boolean } }) {
  const [title, setTitle] = useState(page.title);
  const [slug, setSlug] = useState(page.slug);
  const [seo, setSeo] = useState(seo0);
  const save = useAction(savePage, { success: "Page saved" });
  const doSave = () => save.run({ id: page.id, title, slug, seo });
  const path = slug ? `/${slug}` : "/";
  return (
    <>
      <PageHeader title={title || "Untitled page"} back={{ href: "/admin/pages", label: "Pages" }} description={<span className="font-mono text-[12px]">{path}</span>} />
      <PublishBar kind="page" id={page.id} status={page.status} dirty={dirty} publicPath={path} canPublish={perms.publish} canDelete={perms.del} deletable={!page.system} onSave={perms.write ? doSave : undefined} saving={save.pending} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-6">
          <Card title="Sections" description="Drag to reorder. Changes save to the draft immediately — publish to make them live.">
            <SectionsBuilder owner={{ type: "page", id: page.id }} initial={sections} />
          </Card>
        </div>
        <div className="flex flex-col gap-6">
          <Card title="Page">
            <div className="flex flex-col gap-4">
              <Field label="Title" htmlFor="p-title" error={save.fieldErrors.title}>
                <Input id="p-title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={!perms.write} />
              </Field>
              <Field label="URL path" htmlFor="p-slug" error={save.fieldErrors.slug} help={page.system ? "System page — the URL is fixed." : "Lowercase words and hyphens; use / for nesting."}>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-zinc-400">/</span>
                  <Input id="p-slug" value={slug} onChange={(e) => setSlug(e.target.value)} disabled={page.system || !perms.write} className="font-mono" />
                </div>
              </Field>
            </div>
          </Card>
          <SeoPanel value={seo} onChange={setSeo} fallbackTitle={title} path={path} titleTemplate={titleTemplate} errors={save.fieldErrors} />
        </div>
      </div>
    </>
  );
}
