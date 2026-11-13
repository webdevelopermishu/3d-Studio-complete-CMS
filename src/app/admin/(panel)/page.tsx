import Link from "next/link";
import { requirePageUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Card, PageHeader, Badge, ButtonLink } from "@/components/admin/ui";
import { loadSeoReport } from "@/server/admin/seo-report";

export const metadata = { title: "Dashboard" };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ forbidden?: string }> }) {
  const user = await requirePageUser("dashboard.view");
  const { forbidden } = await searchParams;
  const [pages, projects, cases, services, articles, media, newSubs, subs, activity, seo, missingAlt] = await Promise.all([
    db.page.count({ where: { deletedAt: null } }),
    db.project.count({ where: { deletedAt: null } }),
    db.project.count({ where: { deletedAt: null, isCaseStudy: true, status: "PUBLISHED" } }),
    db.service.count({ where: { deletedAt: null } }),
    db.article.count({ where: { deletedAt: null } }),
    db.media.count({ where: { deletedAt: null } }),
    db.contactSubmission.count({ where: { status: "NEW" } }),
    user.permissions.has("submission.read") ? db.contactSubmission.findMany({ orderBy: { createdAt: "desc" }, take: 5 }) : Promise.resolve([]),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { user: { select: { name: true } } } }),
    loadSeoReport(),
    db.media.count({ where: { deletedAt: null, kind: "IMAGE", alt: "", posterOf: { none: {} } } }),
  ]);
  const errors = seo.rows.reduce((n, r) => n + r.issues.filter((i) => i.severity === "error").length, 0);
  const warnings = seo.rows.reduce((n, r) => n + r.issues.filter((i) => i.severity === "warning").length, 0);
  const stat = (label: string, value: number, href: string, note?: string) => (
    <Link href={href} className="rounded-lg border border-zinc-200 bg-white p-4 hover:border-zinc-400">
      <p className="text-[12px] uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {note && <p className="mt-0.5 text-[12px] text-zinc-500">{note}</p>}
    </Link>
  );
  return (
    <>
      <PageHeader title={`Hello, ${user.name.split(" ")[0]}`} description="Here's what's happening on the site." actions={<ButtonLink href="/" target="_blank">View site ↗</ButtonLink>} />
      {forbidden && <p className="mb-4 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">Your role doesn&apos;t have access to that area ({forbidden}).</p>}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {stat("Pages", pages, "/admin/pages")}
        {stat("Projects", projects, "/admin/projects", `${cases} live case studies`)}
        {stat("Services", services, "/admin/services")}
        {stat("Articles", articles, "/admin/articles")}
        {stat("Media", media, "/admin/media", missingAlt ? `${missingAlt} missing alt text` : "All images have alt text")}
        {stat("New briefs", newSubs, "/admin/submissions")}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Latest briefs" className="lg:col-span-2" actions={<Link href="/admin/submissions" className="text-[13px] text-zinc-600 hover:text-zinc-900">All →</Link>}>
          {subs.length === 0 ? (
            <p className="text-sm text-zinc-500">No submissions yet.</p>
          ) : (
            <ul className="-my-2 divide-y divide-zinc-100">
              {subs.map((s) => (
                <li key={s.id}>
                  <Link href={`/admin/submissions/${s.id}`} className="flex items-center gap-3 py-2.5 hover:bg-zinc-50">
                    {s.status === "NEW" && <span className="size-2 rounded-full bg-indigo-600" aria-label="New" />}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{s.name} · {s.company ?? s.email}</span>
                      <span className="block truncate text-[12px] text-zinc-500">{s.disciplines.join(", ")} — {s.description}</span>
                    </span>
                    <span className="shrink-0 text-[12px] text-zinc-400">{s.createdAt.toLocaleDateString()}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="SEO health" actions={<Link href="/admin/seo" className="text-[13px] text-zinc-600 hover:text-zinc-900">Details →</Link>}>
          <div className="flex gap-6">
            <div><p className="text-2xl font-semibold text-red-700">{errors}</p><p className="text-[12px] text-zinc-500">errors</p></div>
            <div><p className="text-2xl font-semibold text-amber-700">{warnings}</p><p className="text-[12px] text-zinc-500">warnings</p></div>
            <div><p className="text-2xl font-semibold">{seo.rows.length}</p><p className="text-[12px] text-zinc-500">URLs checked</p></div>
          </div>
        </Card>
        <Card title="Recent activity" className="lg:col-span-3">
          <ul className="-my-1 divide-y divide-zinc-100 text-sm">
            {activity.map((a) => (
              <li key={a.id} className="flex items-center gap-3 py-2">
                <Badge>{a.action}</Badge>
                <span className="flex-1 text-zinc-600">{a.user?.name ?? "System"}</span>
                <span className="text-[12px] text-zinc-400">{a.createdAt.toLocaleString()}</span>
              </li>
            ))}
            {activity.length === 0 && <li className="py-2 text-zinc-500">No activity yet.</li>}
          </ul>
        </Card>
      </div>
    </>
  );
}
