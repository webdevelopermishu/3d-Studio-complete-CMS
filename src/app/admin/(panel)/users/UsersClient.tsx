"use client";
import { useState } from "react";
import { saveUser, deleteUser, saveRolePermissions } from "@/server/admin/people";
import { Badge, Button, Card, Field, Input, Select, Table, Toggle } from "@/components/admin/ui";
import { useAction, useFeedback } from "@/components/admin/feedback";

type U = { id: string; name: string; email: string; roleId: string; roleName: string; active: boolean; lastLoginAt: string | null };
type R = { id: string; key: string; name: string; description: string | null; users: number; permissions: string[] };

export function UsersClient({ meId, users, roles, catalogue }: { meId: string; users: U[]; roles: R[]; catalogue: { key: string; label: string }[] }) {
  const [editing, setEditing] = useState<Partial<U> & { password?: string } | null>(null);
  const save = useAction(saveUser, { success: "User saved" });
  const del = useAction(deleteUser, { success: "User deleted" });
  const { confirm } = useFeedback();
  return (
    <div className="flex flex-col gap-8">
      <Card title="Users" actions={<Button size="sm" variant="primary" onClick={() => setEditing({ name: "", email: "", roleId: roles.find((r) => r.key === "EDITOR")?.id ?? roles[0].id, active: true, password: "" })}>Invite user</Button>}>
        <Table head={["Name", "Email", "Role", "Last sign-in", ""]}>
          {users.map((u) => (
            <tr key={u.id}>
              <td className="px-4 py-2.5 font-medium">{u.name} {u.id === meId && <Badge tone="indigo">You</Badge>} {!u.active && <Badge tone="red">Disabled</Badge>}</td>
              <td className="px-4 py-2.5 text-zinc-600">{u.email}</td>
              <td className="px-4 py-2.5">{u.roleName}</td>
              <td className="px-4 py-2.5 text-[12px] text-zinc-500">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : "Never"}</td>
              <td className="px-4 py-2.5 text-right">
                <Button size="sm" variant="ghost" onClick={() => setEditing({ ...u, password: "" })}>Edit</Button>
                {u.id !== meId && <Button size="sm" variant="ghost" onClick={async () => (await confirm({ title: `Delete ${u.name}?`, body: "Their content stays; authorship is cleared.", confirm: "Delete", danger: true })) && del.run({ id: u.id })}>Delete</Button>}
              </td>
            </tr>
          ))}
        </Table>
        {editing && (
          <form className="mt-4 grid grid-cols-1 gap-4 rounded-md border border-zinc-200 bg-zinc-50 p-4 md:grid-cols-2" onSubmit={async (e) => { e.preventDefault(); const r = await save.run({ ...editing, password: editing.password || undefined }); if (r.ok) setEditing(null); }}>
            <p className="text-sm font-semibold md:col-span-2">{editing.id ? `Edit ${editing.name}` : "New user"}</p>
            <Field label="Name" htmlFor="u-name" error={save.fieldErrors.name}><Input id="u-name" value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
            <Field label="Email" htmlFor="u-email" error={save.fieldErrors.email}><Input id="u-email" type="email" value={editing.email ?? ""} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></Field>
            <Field label="Role" htmlFor="u-role" error={save.fieldErrors.roleId}>
              <Select id="u-role" value={editing.roleId} onChange={(e) => setEditing({ ...editing, roleId: e.target.value })}>{roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</Select>
            </Field>
            <Field label={editing.id ? "New password (optional)" : "Initial password"} htmlFor="u-pw" error={save.fieldErrors.password} help="At least 10 characters with a number. Changing it signs the user out elsewhere.">
              <Input id="u-pw" type="password" autoComplete="new-password" value={editing.password ?? ""} onChange={(e) => setEditing({ ...editing, password: e.target.value })} />
            </Field>
            <Toggle checked={!!editing.active} onChange={(v) => setEditing({ ...editing, active: v })} label="Active" help="Disabled users can't sign in." />
            <div className="flex justify-end gap-2 md:col-span-2"><Button onClick={() => setEditing(null)}>Cancel</Button><Button type="submit" variant="primary" loading={save.pending}>Save user</Button></div>
          </form>
        )}
      </Card>
      <Card title="Roles & permissions" description="Changes apply on the user's next request.">
        <div className="flex flex-col gap-6">{roles.map((r) => <RoleEditor key={r.id} role={r} catalogue={catalogue} />)}</div>
      </Card>
    </div>
  );
}

function RoleEditor({ role, catalogue }: { role: R; catalogue: { key: string; label: string }[] }) {
  const [perms, setPerms] = useState(role.permissions);
  const save = useAction(saveRolePermissions, { success: `${role.name} permissions saved` });
  const dirty = [...perms].sort().join() !== [...role.permissions].sort().join();
  const groups = catalogue.reduce<Record<string, { key: string; label: string }[]>>((acc, p) => ((acc[p.key.split(".")[0]] ??= []).push(p), acc), {});
  return (
    <fieldset className="rounded-md border border-zinc-200 p-4">
      <legend className="px-1 text-sm font-semibold">{role.name} <span className="font-normal text-zinc-500">· {role.users} user(s)</span></legend>
      <p className="mb-3 text-[12px] text-zinc-500">{role.description}</p>
      <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(groups).map(([g, list]) => (
          <div key={g}>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{g}</p>
            {list.map((p) => (
              <label key={p.key} className="flex items-center gap-2 py-0.5 text-[13px]">
                <input type="checkbox" checked={perms.includes(p.key)} onChange={(e) => setPerms(e.target.checked ? [...perms, p.key] : perms.filter((x) => x !== p.key))} />
                {p.label}
              </label>
            ))}
          </div>
        ))}
      </div>
      {dirty && <div className="mt-3 flex justify-end gap-2"><Button size="sm" onClick={() => setPerms(role.permissions)}>Reset</Button><Button size="sm" variant="primary" loading={save.pending} onClick={() => save.run({ roleId: role.id, permissions: perms })}>Save {role.name}</Button></div>}
    </fieldset>
  );
}
