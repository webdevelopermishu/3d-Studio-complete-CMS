import { notFound } from "next/navigation";
import { requirePageUser, can } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getSettings } from "@/server/queries";
import { hasUnpublishedChanges, seoForForm } from "@/server/admin/drafts";
import { ServiceEditor } from "./ServiceEditor";

export const metadata = { title: "Edit service" };

export default async function EditService({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageUser("service.read");
  const { id } = await params;
  const isNew = id === "new";
  const [s, settings] = await Promise.all([
    isNew ? null : db.service.findFirst({ where: { id, deletedAt: null }, include: { seo: true, sections: { orderBy: { order: "asc" } } } }),
    getSettings(),
  ]);
  if (!isNew && !s) notFound();
  return (
    <ServiceEditor
      key={s?.id ?? "new"}
      service={s ? { id: s.id, title: s.title, slug: s.slug, tagline: s.tagline, summary: s.summary, offerings: s.offerings, coverId: s.coverId, order: s.order, status: s.status } : null}
      sections={s?.sections.map((x) => ({ id: x.id, type: x.type, enabled: x.enabled, data: x.data, label: x.label })) ?? []}
      seo={seoForForm(s?.seo ?? null)}
      dirty={!!s && s.status === "PUBLISHED" && hasUnpublishedChanges(s.sections, s.publishedSections)}
      titleTemplate={settings.seoDefaults.titleTemplate}
      perms={{ write: can(user, "service.write"), publish: can(user, "service.publish"), del: can(user, "service.delete") }}
    />
  );
}
