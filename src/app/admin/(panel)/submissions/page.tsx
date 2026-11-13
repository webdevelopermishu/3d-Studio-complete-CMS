import Link from "next/link";
import { requirePageUser, can } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Badge, PageHeader, EmptyState } from "@/components/admin/ui";
import { BulkBar } from "./SubmissionClient";

export const metadata = { title: "Submissions" };
const tone = { NEW: "indigo", READ: "zinc", ARCHIVED: "zinc", SPAM: "red" } as const;

export default async function Submissions({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const user = await requirePageUser("submission.read");
  const { status = "INBOX", q } = await searchParams;
  const where = {
    ...(status === "INBOX" ? { status: { in: ["NEW", "READ"] as ("NEW" | "READ")[] } } : status === "ALL" ? {} : { status: status as "NEW" }),
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { email: { contains: q, mode: "insensitive" as const } }, { company: { contains: q, mode: "insensitive" as const } }, { description: { contains: q, mode: "insensitive" as const } }] } : {}),
  };
  const rows = await db.contactSubmission.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 });
  const tabs = [["INBOX", "Inbox"], ["NEW", "New"], ["ARCHIVED", "Archived"], ["SPAM", "Spam"], ["ALL", "All"]];
  return (
    <>
      <PageHeader title="Submissions" description="Project briefs sent from the contact page." actions={<a href={`/api/admin/submissions/export?status=${status}`} download className="inline-flex h-9 items-center rounded-md border border-zinc-300 bg-white px-3.5 text-sm font-medium hover:border-zinc-500">Export CSV</a>} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <nav className="flex gap-1 rounded-md bg-zinc-200/60 p-1 text-[13px]" aria-label="Filter">
          {tabs.map(([k, l]) => (
            <Link key={k} href={`?status=${k}`} className={`rounded px-2.5 py-1 ${status === k ? "bg-white font-medium shadow-sm" : "text-zinc-600"}`} aria-current={status === k ? "page" : undefined}>{l}</Link>
          ))}
        </nav>
        <form role="search"><input type="hidden" name="status" value={status} /><input name="q" defaultValue={q} placeholder="Search" aria-label="Search submissions" className="h-9 w-56 rounded-md border border-zinc-300 bg-white px-3 text-sm" /></form>
      </div>
      {rows.length === 0 ? <EmptyState title="Nothing here." /> : (
        <BulkBar ids={rows.map((r) => r.id)} canWrite={can(user, "submission.write")}>
          {rows.map((s) => (
            <Link key={s.id} href={`/admin/submissions/${s.id}`} className="flex items-start gap-3 px-4 py-3 hover:bg-zinc-50" data-row={s.id}>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className={`text-sm ${s.status === "NEW" ? "font-semibold" : ""}`}>{s.name}</span>
                  <span className="text-[12px] text-zinc-500">{s.company ?? s.email}</span>
                  <Badge tone={tone[s.status]}>{s.status.toLowerCase()}</Badge>
                </span>
                <span className="mt-0.5 block truncate text-[13px] text-zinc-600">{s.disciplines.join(", ")} · {s.budget ?? "—"} · {s.timeline ?? "—"}</span>
                <span className="block truncate text-[12px] text-zinc-500">{s.description}</span>
              </span>
              <span className="shrink-0 text-[12px] text-zinc-400">{s.createdAt.toLocaleString()}</span>
            </Link>
          ))}
        </BulkBar>
      )}
    </>
  );
}
