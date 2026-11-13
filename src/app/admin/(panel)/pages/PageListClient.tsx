"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Copy } from "lucide-react";
import { savePage, duplicatePage } from "@/server/admin/content";
import { Button, Field, Input } from "@/components/admin/ui";
import { useAction } from "@/components/admin/feedback";
import { slugify } from "@/lib/utils";

export function NewPageButton() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [touched, setTouched] = useState(false);
  const router = useRouter();
  const create = useAction(savePage, { success: "Page created", refresh: false });
  if (!open)
    return (
      <Button variant="primary" onClick={() => setOpen(true)}>
        <Plus className="size-4" /> New page
      </Button>
    );
  return (
    <form
      className="flex flex-wrap items-end gap-2 rounded-lg border border-zinc-200 bg-white p-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await create.run({ title, slug });
        if (r.ok && r.data) router.push(`/admin/pages/${(r.data as { id: string }).id}`);
      }}
    >
      <Field label="Title" htmlFor="np-title" error={create.fieldErrors.title}>
        <Input id="np-title" autoFocus value={title} onChange={(e) => { setTitle(e.target.value); if (!touched) setSlug(slugify(e.target.value, true)); }} required />
      </Field>
      <Field label="URL path" htmlFor="np-slug" error={create.fieldErrors.slug}>
        <Input id="np-slug" value={slug} onChange={(e) => { setTouched(true); setSlug(e.target.value); }} placeholder="about/team" />
      </Field>
      <Button type="submit" variant="primary" loading={create.pending}>Create</Button>
      <Button onClick={() => setOpen(false)}>Cancel</Button>
    </form>
  );
}

export function PageRowActions({ id }: { id: string }) {
  const router = useRouter();
  const dup = useAction(duplicatePage, { success: "Page duplicated", refresh: false });
  return (
    <Button
      size="sm"
      variant="ghost"
      loading={dup.pending}
      onClick={async () => {
        const r = await dup.run({ id });
        if (r.ok && r.data) router.push(`/admin/pages/${(r.data as { id: string }).id}`);
      }}
      title="Duplicate"
      aria-label="Duplicate page"
    >
      <Copy className="size-3.5" />
    </Button>
  );
}
