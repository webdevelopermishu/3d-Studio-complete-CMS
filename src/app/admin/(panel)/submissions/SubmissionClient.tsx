"use client";
import { Children, isValidElement, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { setSubmissionStatus, deleteSubmissions } from "@/server/admin/inbox";
import { Button } from "@/components/admin/ui";
import { useAction, useFeedback } from "@/components/admin/feedback";

/** List wrapper adding checkboxes + bulk actions to server-rendered rows. */
export function BulkBar({ ids, canWrite, children }: { ids: string[]; canWrite: boolean; children: ReactNode }) {
  const [sel, setSel] = useState<string[]>([]);
  const status = useAction(setSubmissionStatus, { success: "Updated" });
  const del = useAction(deleteSubmissions, { success: "Deleted" });
  const { confirm } = useFeedback();
  const rows = Children.toArray(children);
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
      {canWrite && (
        <div className="flex items-center gap-2 border-b border-zinc-200 bg-zinc-50 px-4 py-2 text-[13px]">
          <input type="checkbox" aria-label="Select all" checked={sel.length === ids.length && ids.length > 0} onChange={(e) => setSel(e.target.checked ? ids : [])} />
          <span className="text-zinc-500">{sel.length ? `${sel.length} selected` : "Select"}</span>
          {sel.length > 0 && (
            <>
              <Button size="sm" onClick={() => status.run({ ids: sel, status: "READ" }).then(() => setSel([]))}>Mark read</Button>
              <Button size="sm" onClick={() => status.run({ ids: sel, status: "ARCHIVED" }).then(() => setSel([]))}>Archive</Button>
              <Button size="sm" onClick={() => status.run({ ids: sel, status: "SPAM" }).then(() => setSel([]))}>Spam</Button>
              <Button size="sm" variant="danger" onClick={async () => (await confirm({ title: `Delete ${sel.length} submission(s)?`, body: "This permanently removes personal data.", confirm: "Delete", danger: true })) && del.run({ ids: sel }).then(() => setSel([]))}>Delete</Button>
            </>
          )}
        </div>
      )}
      <ul className="divide-y divide-zinc-100">
        {rows.map((row, i) => {
          const id = isValidElement(row) ? (row.props as { "data-row"?: string })["data-row"] ?? ids[i] : ids[i];
          return (
            <li key={id} className="flex items-center">
              {canWrite && (
                <input type="checkbox" className="ml-4" aria-label="Select submission" checked={sel.includes(id)} onChange={(e) => setSel(e.target.checked ? [...sel, id] : sel.filter((x) => x !== id))} />
              )}
              <div className="min-w-0 flex-1">{row}</div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function SubmissionActions({ id, status }: { id: string; status: string }) {
  const set = useAction(setSubmissionStatus, { success: "Updated" });
  const del = useAction(deleteSubmissions, { success: "Deleted", refresh: false });
  const { confirm } = useFeedback();
  const router = useRouter();
  return (
    <div className="flex flex-wrap gap-2">
      {status !== "READ" && <Button size="sm" onClick={() => set.run({ ids: [id], status: "READ" })}>Mark read</Button>}
      {status !== "NEW" && <Button size="sm" onClick={() => set.run({ ids: [id], status: "NEW" })}>Mark unread</Button>}
      {status !== "ARCHIVED" && <Button size="sm" onClick={() => set.run({ ids: [id], status: "ARCHIVED" })}>Archive</Button>}
      {status !== "SPAM" && <Button size="sm" onClick={() => set.run({ ids: [id], status: "SPAM" })}>Spam</Button>}
      <Button size="sm" variant="danger" onClick={async () => { if (await confirm({ title: "Delete this submission?", confirm: "Delete", danger: true })) { const r = await del.run({ ids: [id] }); if (r.ok) router.push("/admin/submissions"); } }}>Delete</Button>
    </div>
  );
}
