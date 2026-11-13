import { notFound } from "next/navigation";
import { requirePageUser, can } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getSettings } from "@/server/queries";
import { hasUnpublishedChanges, seoForForm } from "@/server/admin/drafts";
import { PageEditor } from "./PageEditor";

export const metadata = { title: "Edit page" };

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageUser("page.read");
  const { id } = await params;
  const [page, settings] = await Promise.all([
    db.page.findFirst({ where: { id, deletedAt: null }, include: { seo: true, sections: { orderBy: { order: "asc" } } } }),
    getSettings(),
  ]);
  if (!page) notFound();
  return (
    <PageEditor
      page={{ id: page.id, title: page.title, slug: page.slug, status: page.status, system: page.system }}
      sections={page.sections.map((s) => ({ id: s.id, type: s.type, enabled: s.enabled, data: s.data, label: s.label }))}
      seo={seoForForm(page.seo)}
      dirty={page.status === "PUBLISHED" && hasUnpublishedChanges(page.sections, page.publishedSections)}
      titleTemplate={settings.seoDefaults.titleTemplate}
      perms={{ write: can(user, "page.write"), publish: can(user, "page.publish"), del: can(user, "page.delete") }}
    />
  );
}
