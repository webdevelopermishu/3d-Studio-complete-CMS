import { requirePageUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/ui";
import { ProfileForm } from "./ProfileForm";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const me = await requirePageUser();
  const sessions = await db.session.findMany({ where: { userId: me.id, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } });
  return (
    <>
      <PageHeader title="Your profile" description={`${me.email} · ${me.roleName}`} />
      <ProfileForm name={me.name} sessions={sessions.map((s) => ({ id: s.id, current: s.id === me.sessionId, ua: s.userAgent ?? "Unknown device", ip: s.ip ?? "", createdAt: s.createdAt.toISOString() }))} />
    </>
  );
}
