import { requirePageUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getSettings } from "@/server/queries";
import { Shell } from "@/components/admin/Shell";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser();
  const [settings, newSubmissions] = await Promise.all([
    getSettings(),
    user.permissions.has("submission.read") ? db.contactSubmission.count({ where: { status: "NEW" } }) : Promise.resolve(0),
  ]);
  return (
    <Shell user={{ name: user.name, email: user.email, roleName: user.roleName }} perms={[...user.permissions]} siteName={settings.siteName} newSubmissions={newSubmissions}>
      {children}
    </Shell>
  );
}
