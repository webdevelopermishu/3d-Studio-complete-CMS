"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveService } from "@/server/admin/content";
import { slugify } from "@/lib/utils";
import { Button, Card, Field, Input, PageHeader, Textarea } from "@/components/admin/ui";
import { useAction } from "@/components/admin/feedback";
import { MediaPicker } from "@/components/admin/MediaPicker";
import { StringList } from "@/components/admin/pickers";
import { SectionsBuilder } from "@/components/admin/SectionsBuilder";
import { PublishBar, SeoPanel, emptySeo, type SeoValue } from "@/components/admin/content-common";

type S = { id: string; title: string; slug: string; tagline: string | null; summary: string | null; offerings: string[]; coverId: string | null; order: number; status: string };

export function ServiceEditor({ service, sections, seo: seo0, dirty, titleTemplate, perms }: { service: S | null; sections: { id: string; type: string; enabled: boolean; data: unknown; label: string | null }[]; seo: SeoValue; dirty: boolean; titleTemplate?: string; perms: { write: boolean; publish: boolean; del: boolean } }) {
  const [f, setF] = useState<Omit<S, "id" | "status">>(service ?? { title: "", slug: "", tagline: null, summary: null, offerings: [], coverId: null, order: 0 });
  const [seo, setSeo] = useState<SeoValue>(service ? seo0 : emptySeo);
  const [slugTouched, setSlugTouched] = useState(!!service);
  const router = useRouter();
  const save = useAction(saveService, { success: service ? "Service saved" : "Service created", refresh: !!service });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const doSave = async () => {
    const r = await save.run({ ...(service ? { id: service.id } : {}), ...f, seo });
    if (r.ok && !service && r.data) router.push(`/admin/services/${(r.data as { id: string }).id}`);
  };
  const path = `/expertise/${f.slug}`;
  const e = save.fieldErrors;
  return (
    <>
      <PageHeader title={f.title || "New service"} back={{ href: "/admin/services", label: "Services" }} description={<span className="font-mono text-[12px]">{path}</span>} />
      {service ? (
        <PublishBar kind="service" id={service.id} status={service.status} dirty={dirty} publicPath={path} canPublish={perms.publish} canDelete={perms.del} onSave={perms.write ? doSave : undefined} saving={save.pending} />
      ) : (
        <div className="mb-6 flex justify-end"><Button variant="primary" onClick={doSave} loading={save.pending}>Create service</Button></div>
      )}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-6">
          <Card title="Service">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Title" htmlFor="sv-title" error={e.title} className="md:col-span-2">
                <Input id="sv-title" value={f.title} onChange={(ev) => { set("title", ev.target.value); if (!slugTouched) set("slug", slugify(ev.target.value)); }} />
              </Field>
              <Field label="Slug" htmlFor="sv-slug" error={e.slug}>
                <Input id="sv-slug" className="font-mono" value={f.slug} onChange={(ev) => { setSlugTouched(true); set("slug", ev.target.value); }} />
              </Field>
              <Field label="Order" htmlFor="sv-order">
                <Input id="sv-order" type="number" min={0} value={f.order} onChange={(ev) => set("order", Number(ev.target.value) || 0)} className="w-28" />
              </Field>
              <Field label="Tagline" htmlFor="sv-tag" help="Short line under the title on panels." className="md:col-span-2">
                <Input id="sv-tag" value={f.tagline ?? ""} onChange={(ev) => set("tagline", ev.target.value || null)} />
              </Field>
              <Field label="Summary" htmlFor="sv-sum" help="Used on the expertise index, the contact brief and as the default meta description." className="md:col-span-2">
                <Textarea id="sv-sum" value={f.summary ?? ""} onChange={(ev) => set("summary", ev.target.value || null)} />
              </Field>
            </div>
          </Card>
          {service && (
            <Card title="Page sections" description="The hero comes from the title and cover. Add chapters, the services list, related work and calls to action.">
              <SectionsBuilder owner={{ type: "service", id: service.id }} initial={sections} />
            </Card>
          )}
        </div>
        <div className="flex flex-col gap-6">
          <Card title="Cover"><MediaPicker value={f.coverId} onChange={(v) => set("coverId", v)} /></Card>
          <Card title="Offerings" description="Listed on the page and offered as options in the contact brief.">
            <StringList value={f.offerings} onChange={(v) => set("offerings", v)} placeholder="e.g. Exterior renderings" />
          </Card>
          <SeoPanel value={seo} onChange={setSeo} fallbackTitle={f.title} fallbackDescription={f.summary} path={path} titleTemplate={titleTemplate} errors={e} />
        </div>
      </div>
    </>
  );
}
