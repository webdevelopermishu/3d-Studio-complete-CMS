import { notFound } from "next/navigation";
import { requirePageUser, can } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Badge, Card, PageHeader } from "@/components/admin/ui";
import { SubmissionActions } from "../SubmissionClient";

export const metadata = { title: "Submission" };

export default async function SubmissionDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageUser("submission.read");
  const { id } = await params;
  let s = await db.contactSubmission.findUnique({ where: { id } });
  if (!s) notFound();
  if (s.status === "NEW" && can(user, "submission.write")) s = await db.contactSubmission.update({ where: { id }, data: { status: "READ" } });
  const row = (label: string, value: React.ReactNode) =>
    value ? (
      <div className="grid grid-cols-[160px_1fr] gap-3 py-2 text-sm">
        <dt className="text-zinc-500">{label}</dt>
        <dd className="whitespace-pre-wrap text-zinc-900">{value}</dd>
      </div>
    ) : null;
  const link = (u: string | null) => (u && /^https?:\/\//.test(u) ? <a href={u} target="_blank" rel="noopener noreferrer nofollow" className="text-indigo-700 underline">{u}</a> : u);
  return (
    <>
      <PageHeader title={s.projectName || `Brief from ${s.name}`} back={{ href: "/admin/submissions", label: "Submissions" }} description={<>{s.createdAt.toLocaleString()} · <Badge>{s.status.toLowerCase()}</Badge></>} actions={can(user, "submission.write") && <SubmissionActions id={s.id} status={s.status} />} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card title="Project">
          <dl className="divide-y divide-zinc-100">
            {row("Disciplines", s.disciplines.join(", "))}
            {row("Services", s.services.join(", "))}
            {row("Description", s.description)}
            {row("Goals", s.goals)}
            {row("Deliverables", s.deliverables)}
            {row("Reference", link(s.referenceUrl))}
            {row("Budget", s.budget)}
            {row("Timeline", s.timeline)}
            {row("Stage", s.stage)}
            {row("Files", link(s.filesUrl))}
            {row("Notes", s.notes)}
          </dl>
        </Card>
        <Card title="Contact">
          <dl className="divide-y divide-zinc-100">
            {row("Name", s.name)}
            {row("Email", <a className="text-indigo-700 underline" href={`mailto:${s.email}?subject=${encodeURIComponent(`Re: your brief${s.projectName ? ` — ${s.projectName}` : ""}`)}`}>{s.email}</a>)}
            {row("Company", s.company)}
            {row("Phone", s.phone)}
            {row("Location", s.location)}
            {row("Prefers", s.contactPref)}
          </dl>
          <p className="mt-4 text-[11px] text-zinc-400">IP {s.ip ?? "—"} · {s.userAgent?.slice(0, 80)}</p>
        </Card>
      </div>
    </>
  );
}
