"use client";
import { Trash2, Pencil } from "lucide-react";
import { deleteTemplate, renameTemplate } from "@/server/admin/sections";
import { Button, Table } from "@/components/admin/ui";
import { useAction, useFeedback } from "@/components/admin/feedback";

export function TemplateRows({ rows }: { rows: { id: string; name: string; type: string; updated: string }[] }) {
  const del = useAction(deleteTemplate, { success: "Template deleted" });
  const rename = useAction(renameTemplate, { success: "Renamed" });
  const { confirm } = useFeedback();
  return (
    <Table head={["Name", "Section type", "Updated", ""]}>
      {rows.map((r) => (
        <tr key={r.id}>
          <td className="px-4 py-2.5 font-medium">{r.name}</td>
          <td className="px-4 py-2.5 text-zinc-600">{r.type}</td>
          <td className="px-4 py-2.5 text-[12px] text-zinc-500">{new Date(r.updated).toLocaleDateString()}</td>
          <td className="px-4 py-2.5 text-right">
            <Button size="sm" variant="ghost" aria-label={`Rename ${r.name}`} onClick={() => { const name = window.prompt("Template name", r.name); if (name && name !== r.name) rename.run({ id: r.id, name }); }}><Pencil className="size-3.5" /></Button>
            <Button size="sm" variant="ghost" aria-label={`Delete ${r.name}`} onClick={async () => (await confirm({ title: `Delete “${r.name}”?`, body: "Sections already placed on pages are not affected.", confirm: "Delete", danger: true })) && del.run({ id: r.id })}><Trash2 className="size-3.5" /></Button>
          </td>
        </tr>
      ))}
    </Table>
  );
}
