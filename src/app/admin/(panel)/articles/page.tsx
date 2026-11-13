import Link from "next/link";
import { requirePageUser, can } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { ButtonLink, PageHeader, StatusBadge, Table } from "@/components/admin/ui";

export const metadata = { title: "Newsroom" };

export default async function ArticlesList({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await requirePageUser("article.read");
  const { q } = await searchParams;
  const rows = await db.article.findMany({
    where: { deletedAt: null, ...(q ? { title: { contains: q, mode: "insensitive" } } : {}) },
    orderBy: [{ publishedAt: { sort: "desc", nulls: "first" } }, { createdAt: "desc" }],
    include: { author: { select: { name: true } } },
  });
  return (
    <>
      <PageHeader title="Newsroom" description="Articles and studio notes." actions={can(user, "article.write") && <ButtonLink href="/admin/articles/new" variant="primary">New article</ButtonLink>} />
      <form className="mb-4" role="search"><input name="q" defaultValue={q} placeholder="Search articles" aria-label="Search articles" className="h-9 w-64 rounded-md border border-zinc-300 bg-white px-3 text-sm" /></form>
      <Table head={["Title", "Author", "Publish date", "Status"]}>
        {rows.map((a) => (
          <tr key={a.id} className="hover:bg-zinc-50">
            <td className="px-4 py-2.5"><Link href={`/admin/articles/${a.id}`} className="font-medium hover:underline">{a.title}</Link><span className="block font-mono text-[12px] text-zinc-500">/newsroom/{a.slug}</span></td>
            <td className="px-4 py-2.5 text-zinc-600">{a.author?.name ?? "—"}</td>
            <td className="px-4 py-2.5 text-zinc-600">{a.publishedAt ? a.publishedAt.toLocaleDateString() : "—"}{a.publishedAt && a.publishedAt > new Date() && " (scheduled)"}</td>
            <td className="px-4 py-2.5"><StatusBadge status={a.status} /></td>
          </tr>
        ))}
      </Table>
    </>
  );
}
