import Link from "next/link";
import { requirePageUser, can } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { imageUrl } from "@/lib/media/url";
import { Badge, ButtonLink, PageHeader, StatusBadge, Table } from "@/components/admin/ui";
import { hasUnpublishedChanges } from "@/server/admin/drafts";

export const metadata = { title: "Projects" };
const PER_PAGE = 30;

export default async function ProjectsList({ searchParams }: { searchParams: Promise<{ q?: string; type?: string; service?: string; page?: string }> }) {
  const user = await requirePageUser("project.read");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where = {
    deletedAt: null,
    ...(sp.q ? { OR: [{ title: { contains: sp.q, mode: "insensitive" as const } }, { client: { contains: sp.q, mode: "insensitive" as const } }] } : {}),
    ...(sp.type === "case" ? { isCaseStudy: true } : sp.type === "wall" ? { isCaseStudy: false } : {}),
    ...(sp.service ? { serviceId: sp.service } : {}),
  };
  const [rows, total, services] = await Promise.all([
    db.project.findMany({
      where, orderBy: [{ order: "asc" }, { createdAt: "desc" }], skip: (page - 1) * PER_PAGE, take: PER_PAGE,
      include: { cover: { select: { url: true } }, service: { select: { title: true } }, sections: { select: { id: true, type: true, enabled: true, data: true }, orderBy: { order: "asc" } } },
    }),
    db.project.count({ where }),
    db.service.findMany({ where: { deletedAt: null }, select: { id: true, title: true }, orderBy: { order: "asc" } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const qs = (p: number) => `?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), ...(sp.type ? { type: sp.type } : {}), ...(sp.service ? { service: sp.service } : {}), page: String(p) })}`;
  return (
    <>
      <PageHeader title="Projects" description="Portfolio items. Case studies get their own page; every project can appear on the work wall." actions={can(user, "project.write") && <ButtonLink href="/admin/projects/new" variant="primary">New project</ButtonLink>} />
      <form className="mb-4 flex flex-wrap gap-2" role="search">
        <input name="q" defaultValue={sp.q} placeholder="Search title or client" className="h-9 w-64 rounded-md border border-zinc-300 bg-white px-3 text-sm" aria-label="Search projects" />
        <select name="type" defaultValue={sp.type ?? ""} className="h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm" aria-label="Type">
          <option value="">All types</option>
          <option value="case">Case studies</option>
          <option value="wall">Wall only</option>
        </select>
        <select name="service" defaultValue={sp.service ?? ""} className="h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm" aria-label="Service">
          <option value="">All services</option>
          {services.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
        </select>
        <button className="h-9 rounded-md border border-zinc-300 bg-white px-3 text-sm">Filter</button>
      </form>
      <Table head={["", "Project", "Service", "Type", "Status", "Order"]}>
        {rows.map((p) => (
          <tr key={p.id} className="hover:bg-zinc-50">
            <td className="w-16 px-4 py-2">
              {p.cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl(p.cover.url, 384)} alt="" className="h-10 w-14 rounded object-cover" />
              ) : <span className="block h-10 w-14 rounded bg-zinc-100" />}
            </td>
            <td className="px-4 py-2">
              <Link href={`/admin/projects/${p.id}`} className="font-medium text-zinc-900 hover:underline">{p.title}</Link>
              <span className="block text-[12px] text-zinc-500">{p.client ?? "—"} · {p.year ?? "—"}</span>
            </td>
            <td className="px-4 py-2 text-zinc-600">{p.service?.title ?? "—"}</td>
            <td className="px-4 py-2">{p.isCaseStudy ? <Badge tone="indigo">Case study</Badge> : <Badge>Wall</Badge>} {p.featured && <Badge tone="amber">Featured</Badge>}</td>
            <td className="px-4 py-2"><StatusBadge status={p.status} dirty={p.isCaseStudy && p.status === "PUBLISHED" && hasUnpublishedChanges(p.sections, p.publishedSections)} /></td>
            <td className="px-4 py-2 tabular-nums text-zinc-500">{p.order}</td>
          </tr>
        ))}
      </Table>
      {pages > 1 && (
        <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Pagination">
          <span className="text-zinc-500">{total} projects · page {page} of {pages}</span>
          <span className="flex gap-2">
            {page > 1 && <Link className="rounded border border-zinc-300 bg-white px-3 py-1" href={qs(page - 1)}>Previous</Link>}
            {page < pages && <Link className="rounded border border-zinc-300 bg-white px-3 py-1" href={qs(page + 1)}>Next</Link>}
          </span>
        </nav>
      )}
    </>
  );
}
