import Link from "next/link";
import { requirePageUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getSettings } from "@/server/queries";
import { loadSeoReport } from "@/server/admin/seo-report";
import { Badge, Card, PageHeader, StatusBadge, Table } from "@/components/admin/ui";
import { SeoDefaultsForm, RedirectManager } from "./SeoClient";

export const metadata = { title: "SEO" };

export default async function SeoPage({ searchParams }: { searchParams: Promise<{ only?: string }> }) {
  await requirePageUser("seo.write");
  const { only } = await searchParams;
  const [report, settings, redirects] = await Promise.all([loadSeoReport(), getSettings(), db.redirect.findMany({ orderBy: { createdAt: "desc" } })]);
  const rows = report.rows
    .map((r) => ({ ...r, score: r.issues.filter((i) => i.severity === "error").length * 10 + r.issues.filter((i) => i.severity === "warning").length }))
    .filter((r) => (only === "problems" ? r.score > 0 : true))
    .sort((a, b) => b.score - a.score);
  const totals = { error: 0, warning: 0, info: 0 };
  report.rows.forEach((r) => r.issues.forEach((i) => totals[i.severity]++));
  return (
    <>
      <PageHeader title="SEO" description="Checks run on every page, service, case study and article. Fix issues from each item's “Search & social” panel." />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-zinc-200 bg-white p-4"><p className="text-2xl font-semibold text-red-700">{totals.error}</p><p className="text-[12px] text-zinc-500">Errors</p></div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4"><p className="text-2xl font-semibold text-amber-700">{totals.warning}</p><p className="text-[12px] text-zinc-500">Warnings</p></div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4"><p className="text-2xl font-semibold">{report.rows.length}</p><p className="text-[12px] text-zinc-500">URLs checked</p></div>
        <Link href="/admin/media" className="rounded-lg border border-zinc-200 bg-white p-4 hover:border-zinc-400"><p className="text-2xl font-semibold">{report.missingAlt}</p><p className="text-[12px] text-zinc-500">Images missing alt text</p></Link>
      </div>
      <div className="mb-3 flex items-center gap-3 text-sm">
        <Link href="/admin/seo" className={!only ? "font-semibold" : "text-zinc-500"}>All</Link>
        <Link href="/admin/seo?only=problems" className={only === "problems" ? "font-semibold" : "text-zinc-500"}>With problems</Link>
        <span className="flex-1" />
        <a href="/sitemap.xml" target="_blank" className="text-zinc-600 hover:underline">sitemap.xml ↗</a>
        <a href="/robots.txt" target="_blank" className="text-zinc-600 hover:underline">robots.txt ↗</a>
      </div>
      <Table head={["Content", "Effective title", "Status", "Issues"]}>
        {rows.map((r) => (
          <tr key={r.key} className="align-top hover:bg-zinc-50">
            <td className="px-4 py-2.5">
              <Link href={r.editHref} className="font-medium hover:underline">{r.label}</Link>
              <span className="block text-[12px] text-zinc-500">{r.kind} · <span className="font-mono">{r.path}</span></span>
            </td>
            <td className="max-w-xs px-4 py-2.5 text-[13px] text-zinc-700">{r.title} <span className="text-zinc-400">({r.title.length})</span></td>
            <td className="px-4 py-2.5"><StatusBadge status={r.status} /></td>
            <td className="px-4 py-2.5">
              {r.issues.filter((i) => i.severity !== "info").length === 0 ? <Badge tone="green">Good</Badge> : (
                <ul className="flex flex-col gap-1">
                  {r.issues.filter((i) => i.severity !== "info").map((i) => (
                    <li key={i.code} className="flex items-start gap-1.5 text-[12px]"><Badge tone={i.severity === "error" ? "red" : "amber"}>{i.severity}</Badge><span>{i.message}</span></li>
                  ))}
                </ul>
              )}
            </td>
          </tr>
        ))}
      </Table>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card title="Site-wide defaults" description="Used when a page doesn't set its own values.">
          <SeoDefaultsForm initial={{ titleTemplate: settings.seoDefaults.titleTemplate ?? `%s | ${settings.siteName}`, description: settings.seoDefaults.description ?? "", ogImageId: settings.seoDefaults.ogImageId ?? null, twitterHandle: settings.seoDefaults.twitterHandle ?? "" }} />
        </Card>
        <Card title="Redirects" description="Old URLs are sent to new ones with a permanent (308) or temporary (307) redirect.">
          <RedirectManager rows={redirects.map((r) => ({ id: r.id, source: r.source, destination: r.destination, permanent: r.permanent, enabled: r.enabled, hits: r.hits, note: r.note }))} />
        </Card>
      </div>
    </>
  );
}
