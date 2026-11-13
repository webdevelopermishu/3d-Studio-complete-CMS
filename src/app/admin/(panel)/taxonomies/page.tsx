import { requirePageUser, can } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/ui";
import { TermList } from "./TermList";

export const metadata = { title: "Categories" };

export default async function Taxonomies() {
  const user = await requirePageUser("project.read");
  const [categories, deliverables, industries] = await Promise.all([
    db.projectCategory.findMany({ orderBy: { order: "asc" }, include: { _count: { select: { projects: true } } } }),
    db.deliverable.findMany({ orderBy: { order: "asc" }, include: { _count: { select: { projects: true } } } }),
    db.industry.findMany({ orderBy: { order: "asc" }, include: { _count: { select: { projects: true } } } }),
  ]);
  const map = (l: typeof categories) => l.map((t) => ({ id: t.id, name: t.name, slug: t.slug, order: t.order, count: t._count.projects }));
  const editable = can(user, "taxonomy.write");
  return (
    <>
      <PageHeader title="Categories" description="The three filter groups on the work wall. Slugs appear in shareable filter URLs." />
      <div className="grid gap-6 lg:grid-cols-3">
        <TermList model="category" title="Service" terms={map(categories)} editable={editable} />
        <TermList model="deliverable" title="Deliverable" terms={map(deliverables)} editable={editable} />
        <TermList model="industry" title="Industry" terms={map(industries)} editable={editable} />
      </div>
    </>
  );
}
