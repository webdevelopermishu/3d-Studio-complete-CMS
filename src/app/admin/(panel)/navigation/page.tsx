import { requirePageUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/ui";
import { MenuEditor } from "./MenuEditor";

export const metadata = { title: "Navigation" };

const HELP: Record<string, string> = {
  MAIN: "Full-screen menu opened from the header button.",
  FOOTER_SITEMAP: "Footer “Sitemap” column.",
  FOOTER_EXPERTISE: "Footer “Expertise” column.",
  SOCIAL: "Social links (menu, footer and Organization schema).",
  LEGAL: "Footer legal links.",
};

export default async function Navigation() {
  await requirePageUser("navigation.write");
  const menus = await db.navigationMenu.findMany({ include: { items: { orderBy: { order: "asc" } } }, orderBy: { key: "asc" } });
  const order = ["MAIN", "FOOTER_SITEMAP", "FOOTER_EXPERTISE", "SOCIAL", "LEGAL"];
  menus.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
  return (
    <>
      <PageHeader title="Navigation" description="Drag to reorder. Links can be site paths (/work), full URLs, mailto: or tel:." />
      <div className="grid gap-6 lg:grid-cols-2">
        {menus.map((m) => (
          <MenuEditor key={m.id} menuId={m.id} name={m.name} help={HELP[m.key]} initial={m.items.map((i) => ({ id: i.id, label: i.label, href: i.href, newTab: i.newTab, enabled: i.enabled }))} />
        ))}
      </div>
    </>
  );
}
