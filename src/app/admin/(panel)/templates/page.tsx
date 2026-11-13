import { requirePageUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { sections } from "@/sections/registry";
import { PageHeader, EmptyState } from "@/components/admin/ui";
import { TemplateRows } from "./TemplateRows";

export const metadata = { title: "Section templates" };

export default async function Templates() {
  await requirePageUser("template.write");
  const rows = await db.sectionTemplate.findMany({ orderBy: { name: "asc" } });
  return (
    <>
      <PageHeader title="Section templates" description="Reusable, pre-filled sections. Save one from any section's toolbar in the page builder, then insert it from “Add section”." />
      {rows.length === 0 ? (
        <EmptyState title="No templates yet">Open a page, hover a section and click the bookmark icon.</EmptyState>
      ) : (
        <TemplateRows rows={rows.map((r) => ({ id: r.id, name: r.name, type: sections[r.type as keyof typeof sections]?.label ?? r.type, updated: r.updatedAt.toISOString() }))} />
      )}
    </>
  );
}
