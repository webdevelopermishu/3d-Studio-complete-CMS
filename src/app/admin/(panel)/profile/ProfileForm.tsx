"use client";
import { useState } from "react";
import { updateProfile, revokeOtherSessions } from "@/server/admin/people";
import { Badge, Button, Card, Field, Input } from "@/components/admin/ui";
import { useAction } from "@/components/admin/feedback";

export function ProfileForm({ name: name0, sessions }: { name: string; sessions: { id: string; current: boolean; ua: string; ip: string; createdAt: string }[] }) {
  const [name, setName] = useState(name0);
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "" });
  const save = useAction(updateProfile, { success: "Profile updated" });
  const revoke = useAction(revokeOtherSessions, { success: "Other sessions signed out" });
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card title="Details">
        <form className="flex flex-col gap-4" onSubmit={async (e) => { e.preventDefault(); const r = await save.run({ name, ...(pw.newPassword ? pw : {}) }); if (r.ok) setPw({ currentPassword: "", newPassword: "" }); }}>
          <Field label="Name" htmlFor="pf-name"><Input id="pf-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></Field>
          <p className="text-sm font-medium text-zinc-800">Change password</p>
          <Field label="Current password" htmlFor="pf-cur" error={save.fieldErrors.currentPassword}><Input id="pf-cur" type="password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} /></Field>
          <Field label="New password" htmlFor="pf-new" error={save.fieldErrors.newPassword} help="At least 10 characters including a number. Other sessions will be signed out."><Input id="pf-new" type="password" autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} /></Field>
          <Button type="submit" variant="primary" className="self-start" loading={save.pending}>Save</Button>
        </form>
      </Card>
      <Card title="Active sessions" actions={sessions.length > 1 && <Button size="sm" loading={revoke.pending} onClick={() => revoke.run()}>Sign out others</Button>}>
        <ul className="divide-y divide-zinc-100 text-sm">
          {sessions.map((s) => (
            <li key={s.id} className="py-2.5">
              <p className="truncate text-zinc-800">{s.ua} {s.current && <Badge tone="green">This device</Badge>}</p>
              <p className="text-[12px] text-zinc-500">{s.ip} · since {new Date(s.createdAt).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
