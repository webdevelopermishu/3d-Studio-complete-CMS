import Link from "next/link";
import { requirePageUser, can } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PageHeader, StatusBadge, Table, Badge } from "@/components/admin/ui";
import { hasUnpublishedChanges } from "@/server/admin/drafts";
import { NewPageButton, PageRowActions } from "./PageListClient";

export const metadata = { title: "Pages" };

export default async function PagesList({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const user = await requirePageUser("page.read");
  const { q, status } = await searchParams;
  const pages = await db.page.findMany({
    where: {
      deletedAt: null,
      ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { slug: { contains: q, mode: "insensitive" } }] } : {}),
      ...(status ? { status: status as "DRAFT" | "PUBLISHED" } : {}),
    },
    orderBy: [{ system: "desc" }, { slug: "asc" }],
    include: { sections: { orderBy: { order: "asc" }, select: { id: true, type: true, enabled: true, data: true } }, _count: { select: { sections: true } } },
  });
  return (
    <>
      <PageHeader title="Pages" description="Every page is built from sections. Edit, reorder and publish them here." actions={can(user, "page.write") && <NewPageButton />} />
      <form className="mb-4 flex gap-2" role="search">
        <input name="q" defaultValue={q} placeholder="Search title or URL" className="h-9 w-64 rounded-md border border-zinc-300 bg-white px-3 text-sm" aria-label="Search pages" />
        <select name="status" defaultValue={status ?? ""} className="h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm" aria-label="Filter by status">
          <option value="">All statuses</option>
          <option value="PUBLISHED">Published</option>
          <option value="DRAFT">Draft</option>
        </select>
        <button className="h-9 rounded-md border border-zinc-300 bg-white px-3 text-sm">Filter</button>
      </form>
      <Table head={["Title", "URL", "Sections", "Status", "Updated", ""]}>
        {pages.map((p) => (
          <tr key={p.id} className="hover:bg-zinc-50">
            <td className="px-4 py-2.5">
              <Link href={`/admin/pages/${p.id}`} className="font-medium text-zinc-900 hover:underline">
                {p.title}
              </Link>
              {p.system && <Badge tone="zinc">System</Badge>}
            </td>
            <td className="px-4 py-2.5 font-mono text-[12px] text-zinc-600">/{p.slug}</td>
            <td className="px-4 py-2.5 tabular-nums text-zinc-600">{p._count.sections}</td>
            <td className="px-4 py-2.5">
              <StatusBadge status={p.status} dirty={p.status === "PUBLISHED" && hasUnpublishedChanges(p.sections, p.publishedSections)} />
            </td>
            <td className="px-4 py-2.5 text-[12px] text-zinc-500">{p.updatedAt.toLocaleDateString()}</td>
            <td className="px-4 py-2.5 text-right">{can(user, "page.write") && <PageRowActions id={p.id} />}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}
