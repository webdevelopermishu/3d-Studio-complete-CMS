import { notFound } from "next/navigation";
import { requirePageUser, can } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getSettings } from "@/server/queries";
import { hasUnpublishedChanges, seoForForm } from "@/server/admin/drafts";
import { ProjectEditor } from "./ProjectEditor";

export const metadata = { title: "Edit project" };

export default async function EditProject({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageUser("project.read");
  const { id } = await params;
  const isNew = id === "new";
  const [project, services, categories, deliverables, industries, settings] = await Promise.all([
    isNew ? null : db.project.findFirst({ where: { id, deletedAt: null }, include: { seo: true, sections: { orderBy: { order: "asc" } }, categories: true, deliverables: true, industries: true } }),
    db.service.findMany({ where: { deletedAt: null }, orderBy: { order: "asc" }, select: { id: true, title: true } }),
    db.projectCategory.findMany({ orderBy: { order: "asc" } }),
    db.deliverable.findMany({ orderBy: { order: "asc" } }),
    db.industry.findMany({ orderBy: { order: "asc" } }),
    getSettings(),
  ]);
  if (!isNew && !project) notFound();
  return (
    <ProjectEditor
      key={project?.id ?? "new"}
      project={
        project
          ? {
              id: project.id, title: project.title, slug: project.slug, client: project.client, year: project.year, location: project.location,
              summary: project.summary, lead: project.lead, servicesText: project.servicesText, isCaseStudy: project.isCaseStudy, showOnWall: project.showOnWall,
              featured: project.featured, wallAspect: project.wallAspect as "4/5", coverId: project.coverId, videoId: project.videoId, serviceId: project.serviceId,
              order: project.order, status: project.status, categoryIds: project.categories.map((c) => c.id), deliverableIds: project.deliverables.map((c) => c.id),
              industryIds: project.industries.map((c) => c.id),
            }
          : null
      }
      sections={project?.sections.map((s) => ({ id: s.id, type: s.type, enabled: s.enabled, data: s.data, label: s.label })) ?? []}
      seo={seoForForm(project?.seo ?? null)}
      dirty={!!project && project.status === "PUBLISHED" && hasUnpublishedChanges(project.sections, project.publishedSections)}
      options={{ services, categories, deliverables, industries }}
      titleTemplate={settings.seoDefaults.titleTemplate}
      perms={{ write: can(user, "project.write"), publish: can(user, "project.publish"), del: can(user, "project.delete") }}
    />
  );
}
