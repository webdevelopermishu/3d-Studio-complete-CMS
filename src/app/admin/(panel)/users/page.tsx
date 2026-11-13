import { requirePageUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/admin/ui";
import { UsersClient } from "./UsersClient";

export const metadata = { title: "Users & roles" };

export default async function UsersPage() {
  const me = await requirePageUser("user.manage");
  const [users, roles] = await Promise.all([
    db.user.findMany({ orderBy: { name: "asc" }, include: { role: true } }),
    db.role.findMany({ orderBy: { name: "asc" }, include: { permissions: { include: { permission: true } }, _count: { select: { users: true } } } }),
  ]);
  return (
    <>
      <PageHeader title="Users & roles" description="Who can sign in, and what each role is allowed to do." />
      <UsersClient
        meId={me.id}
        users={users.map((u) => ({ id: u.id, name: u.name, email: u.email, roleId: u.roleId, roleName: u.role.name, active: u.active, lastLoginAt: u.lastLoginAt?.toISOString() ?? null }))}
        roles={roles.map((r) => ({ id: r.id, key: r.key, name: r.name, description: r.description, users: r._count.users, permissions: r.permissions.map((p) => p.permission.key) }))}
        catalogue={Object.entries(PERMISSIONS).map(([key, label]) => ({ key, label }))}
      />
    </>
  );
}
