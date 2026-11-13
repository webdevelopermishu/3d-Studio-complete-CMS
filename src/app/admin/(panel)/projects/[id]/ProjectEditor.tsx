"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveProject } from "@/server/admin/content";
import { slugify } from "@/lib/utils";
import { Button, Card, Field, Input, PageHeader, Select, Textarea, Toggle } from "@/components/admin/ui";
import { useAction } from "@/components/admin/feedback";
import { MediaPicker } from "@/components/admin/MediaPicker";
import { SectionsBuilder } from "@/components/admin/SectionsBuilder";
import { PublishBar, SeoPanel, emptySeo, type SeoValue } from "@/components/admin/content-common";

type Opt = { id: string; title?: string; name?: string };
type P = {
  id: string; title: string; slug: string; client: string | null; year: number | null; location: string | null; summary: string | null; lead: string | null;
  servicesText: string | null; isCaseStudy: boolean; showOnWall: boolean; featured: boolean; wallAspect: "4/5" | "3/2" | "1/1" | "16/9"; coverId: string | null;
  videoId: string | null; serviceId: string | null; order: number; status: string; categoryIds: string[]; deliverableIds: string[]; industryIds: string[];
};
const blank: Omit<P, "id" | "status"> = {
  title: "", slug: "", client: null, year: new Date().getFullYear(), location: null, summary: null, lead: null, servicesText: null, isCaseStudy: false, showOnWall: true,
  featured: false, wallAspect: "4/5", coverId: null, videoId: null, serviceId: null, order: 0, categoryIds: [], deliverableIds: [], industryIds: [],
};
const CASE_SECTIONS = ["caseChapter", "caseMedia", "imageRow", "keepExploring", "caseInsights", "richText", "briefCta", "gateway", "chapter", "editorial", "statement", "figures", "vision"];

function Checks({ label, options, value, onChange }: { label: string; options: Opt[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-[13px] font-medium text-zinc-800">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = value.includes(o.id);
          return (
            <button key={o.id} type="button" aria-pressed={on} onClick={() => onChange(on ? value.filter((x) => x !== o.id) : [...value, o.id])} className={`rounded-full border px-2.5 py-1 text-[12px] ${on ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-500"}`}>
              {o.name ?? o.title}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function ProjectEditor({ project, sections, seo: seo0, dirty, options, titleTemplate, perms }: { project: P | null; sections: { id: string; type: string; enabled: boolean; data: unknown; label: string | null }[]; seo: SeoValue; dirty: boolean; options: { services: Opt[]; categories: Opt[]; deliverables: Opt[]; industries: Opt[] }; titleTemplate?: string; perms: { write: boolean; publish: boolean; del: boolean } }) {
  const [f, setF] = useState<Omit<P, "id" | "status">>(project ?? blank);
  const [seo, setSeo] = useState<SeoValue>(project ? seo0 : emptySeo);
  const [slugTouched, setSlugTouched] = useState(!!project);
  const router = useRouter();
  const save = useAction(saveProject, { success: project ? "Project saved" : "Project created", refresh: !!project });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const e = save.fieldErrors;
  const doSave = async () => {
    const r = await save.run({ ...(project ? { id: project.id } : {}), ...f, seo });
    if (r.ok && !project && r.data) router.push(`/admin/projects/${(r.data as { id: string }).id}`);
  };
  const path = `/case-studies/${f.slug}`;
  return (
    <>
      <PageHeader title={f.title || "New project"} back={{ href: "/admin/projects", label: "Projects" }} description={f.isCaseStudy ? <span className="font-mono text-[12px]">{path}</span> : "Work wall tile"} />
      {project ? (
        <PublishBar kind="project" id={project.id} status={project.status} dirty={dirty} publicPath={f.isCaseStudy ? path : "/work"} canPublish={perms.publish} canDelete={perms.del} onSave={perms.write ? doSave : undefined} saving={save.pending} />
      ) : (
        <div className="mb-6 flex justify-end">
          <Button variant="primary" onClick={doSave} loading={save.pending}>Create project</Button>
        </div>
      )}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-6">
          <Card title="Project">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Title" htmlFor="pr-title" error={e.title} className="md:col-span-2">
                <Input id="pr-title" value={f.title} onChange={(ev) => { set("title", ev.target.value); if (!slugTouched) set("slug", slugify(ev.target.value)); }} />
              </Field>
              <Field label="Slug" htmlFor="pr-slug" error={e.slug}>
                <Input id="pr-slug" className="font-mono" value={f.slug} onChange={(ev) => { setSlugTouched(true); set("slug", ev.target.value); }} />
              </Field>
              <Field label="Client" htmlFor="pr-client">
                <Input id="pr-client" value={f.client ?? ""} onChange={(ev) => set("client", ev.target.value || null)} />
              </Field>
              <Field label="Year" htmlFor="pr-year" error={e.year}>
                <Input id="pr-year" type="number" value={f.year ?? ""} onChange={(ev) => set("year", ev.target.value ? Number(ev.target.value) : null)} />
              </Field>
              <Field label="Location" htmlFor="pr-loc">
                <Input id="pr-loc" value={f.location ?? ""} onChange={(ev) => set("location", ev.target.value || null)} />
              </Field>
              <Field label="Card summary" htmlFor="pr-sum" help="One line used on reel cards and lists." className="md:col-span-2">
                <Input id="pr-sum" value={f.summary ?? ""} maxLength={400} onChange={(ev) => set("summary", ev.target.value || null)} />
              </Field>
              <Field label="Opening statement" htmlFor="pr-lead" help="Large statement under the case-study facts." className="md:col-span-2">
                <Textarea id="pr-lead" value={f.lead ?? ""} onChange={(ev) => set("lead", ev.target.value || null)} />
              </Field>
              <Field label="Services delivered" htmlFor="pr-svc" help="Shown in the case facts, e.g. “Interior renderings, animation”." className="md:col-span-2">
                <Input id="pr-svc" value={f.servicesText ?? ""} onChange={(ev) => set("servicesText", ev.target.value || null)} />
              </Field>
            </div>
          </Card>
          {project && f.isCaseStudy && (
            <Card title="Case study body" description="Chapters, images and related links. Hero, facts and the opening statement come from the fields above.">
              <SectionsBuilder owner={{ type: "project", id: project.id }} initial={sections} allowed={CASE_SECTIONS} />
            </Card>
          )}
          {project && !f.isCaseStudy && <p className="rounded-md border border-dashed border-zinc-300 p-4 text-sm text-zinc-500">Turn on “Has a case-study page” to build a page for this project.</p>}
        </div>
        <div className="flex flex-col gap-6">
          <Card title="Display">
            <div className="flex flex-col gap-4">
              <Toggle checked={f.isCaseStudy} onChange={(v) => set("isCaseStudy", v)} label="Has a case-study page" />
              <Toggle checked={f.showOnWall} onChange={(v) => set("showOnWall", v)} label="Show on the work wall" />
              <Toggle checked={f.featured} onChange={(v) => set("featured", v)} label="Featured (home reel)" />
              <Field label="Wall tile shape" htmlFor="pr-aspect">
                <Select id="pr-aspect" value={f.wallAspect} onChange={(ev) => set("wallAspect", ev.target.value as P["wallAspect"])}>
                  <option value="4/5">Portrait 4:5</option>
                  <option value="3/2">Landscape 3:2</option>
                  <option value="1/1">Square 1:1</option>
                  <option value="16/9">Wide 16:9</option>
                </Select>
              </Field>
              <Field label="Sort order" htmlFor="pr-order" help="Lower numbers come first.">
                <Input id="pr-order" type="number" min={0} value={f.order} onChange={(ev) => set("order", Number(ev.target.value) || 0)} className="w-28" />
              </Field>
            </div>
          </Card>
          <Card title="Media">
            <div className="flex flex-col gap-4">
              <Field label="Cover image"><MediaPicker value={f.coverId} onChange={(v) => set("coverId", v)} /></Field>
              <Field label="Loop video (optional)" help="Plays on the hero, reel and wall."><MediaPicker value={f.videoId} onChange={(v) => set("videoId", v)} accept="video" /></Field>
            </div>
          </Card>
          <Card title="Classification">
            <div className="flex flex-col gap-4">
              <Field label="Discipline (service)" htmlFor="pr-service">
                <Select id="pr-service" value={f.serviceId ?? ""} onChange={(ev) => set("serviceId", ev.target.value || null)}>
                  <option value="">—</option>
                  {options.services.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
                </Select>
              </Field>
              <Checks label="Categories (Service filter)" options={options.categories} value={f.categoryIds} onChange={(v) => set("categoryIds", v)} />
              <Checks label="Deliverables" options={options.deliverables} value={f.deliverableIds} onChange={(v) => set("deliverableIds", v)} />
              <Checks label="Industries" options={options.industries} value={f.industryIds} onChange={(v) => set("industryIds", v)} />
            </div>
          </Card>
          {f.isCaseStudy && <SeoPanel value={seo} onChange={setSeo} fallbackTitle={f.title} fallbackDescription={f.summary} path={path} titleTemplate={titleTemplate} errors={e} />}
        </div>
      </div>
    </>
  );
}
