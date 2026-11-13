import Link from "next/link";
import { requirePageUser, can } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { ButtonLink, PageHeader, StatusBadge, Table } from "@/components/admin/ui";
import { hasUnpublishedChanges } from "@/server/admin/drafts";

export const metadata = { title: "Services" };

export default async function ServicesList() {
  const user = await requirePageUser("service.read");
  const rows = await db.service.findMany({
    where: { deletedAt: null },
    orderBy: { order: "asc" },
    include: { _count: { select: { projects: true } }, sections: { select: { id: true, type: true, enabled: true, data: true }, orderBy: { order: "asc" } } },
  });
  return (
    <>
      <PageHeader title="Services" description="Disciplines with their own expertise page. Order controls menus, the home scene and the contact brief." actions={can(user, "service.write") && <ButtonLink href="/admin/services/new" variant="primary">New service</ButtonLink>} />
      <Table head={["Order", "Service", "URL", "Projects", "Offerings", "Status"]}>
        {rows.map((s) => (
          <tr key={s.id} className="hover:bg-zinc-50">
            <td className="px-4 py-2.5 tabular-nums text-zinc-500">{s.order}</td>
            <td className="px-4 py-2.5"><Link href={`/admin/services/${s.id}`} className="font-medium hover:underline">{s.title}</Link><span className="block text-[12px] text-zinc-500">{s.tagline}</span></td>
            <td className="px-4 py-2.5 font-mono text-[12px] text-zinc-600">/expertise/{s.slug}</td>
            <td className="px-4 py-2.5 tabular-nums">{s._count.projects}</td>
            <td className="px-4 py-2.5 tabular-nums">{s.offerings.length}</td>
            <td className="px-4 py-2.5"><StatusBadge status={s.status} dirty={s.status === "PUBLISHED" && hasUnpublishedChanges(s.sections, s.publishedSections)} /></td>
          </tr>
        ))}
      </Table>
    </>
  );
}
