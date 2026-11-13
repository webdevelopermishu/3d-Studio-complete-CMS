import { notFound } from "next/navigation";
import { requirePageUser, can } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getSettings } from "@/server/queries";
import { seoForForm } from "@/server/admin/drafts";
import { ArticleEditor } from "./ArticleEditor";

export const metadata = { title: "Edit article" };

export default async function EditArticle({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageUser("article.read");
  const { id } = await params;
  const isNew = id === "new";
  const [a, services, settings] = await Promise.all([
    isNew ? null : db.article.findFirst({ where: { id, deletedAt: null }, include: { seo: true, services: { select: { id: true } } } }),
    db.service.findMany({ where: { deletedAt: null }, orderBy: { order: "asc" }, select: { id: true, title: true } }),
    getSettings(),
  ]);
  if (!isNew && !a) notFound();
  return (
    <ArticleEditor
      key={a?.id ?? "new"}
      article={a ? { id: a.id, title: a.title, slug: a.slug, excerpt: a.excerpt, body: a.body as never, coverId: a.coverId, serviceIds: a.services.map((s) => s.id), publishedAt: a.publishedAt?.toISOString() ?? null, status: a.status } : null}
      services={services}
      seo={seoForForm(a?.seo ?? null)}
      titleTemplate={settings.seoDefaults.titleTemplate}
      perms={{ write: can(user, "article.write"), publish: can(user, "article.publish"), del: can(user, "article.delete") }}
    />
  );
}
