/** Permission catalogue + default role grants. Shared by seed, RBAC checks and the Users UI. */
export const PERMISSIONS = {
  "dashboard.view": "View the admin dashboard",
  "page.read": "View pages",
  "page.write": "Create and edit pages",
  "page.publish": "Publish / unpublish pages",
  "page.delete": "Delete pages",
  "project.read": "View projects",
  "project.write": "Create and edit projects",
  "project.publish": "Publish / unpublish projects",
  "project.delete": "Delete projects",
  "service.read": "View services",
  "service.write": "Create and edit services",
  "service.publish": "Publish / unpublish services",
  "service.delete": "Delete services",
  "article.read": "View articles",
  "article.write": "Create and edit articles",
  "article.publish": "Publish / unpublish articles",
  "article.delete": "Delete articles",
  "taxonomy.write": "Manage categories, deliverables and industries",
  "media.read": "Browse the media library",
  "media.write": "Upload and edit media",
  "media.delete": "Delete media",
  "navigation.write": "Edit navigation menus",
  "seo.write": "Edit SEO defaults and redirects",
  "submission.read": "Read contact submissions",
  "submission.write": "Update / delete submissions",
  "settings.write": "Edit global settings and branding",
  "user.manage": "Manage users and roles",
  "template.write": "Manage section templates",
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;
const ALL = Object.keys(PERMISSIONS) as PermissionKey[];

export const ROLE_DEFAULTS: Record<string, { name: string; description: string; permissions: PermissionKey[] }> = {
  ADMIN: { name: "Administrator", description: "Full access, including users and settings.", permissions: ALL },
  EDITOR: {
    name: "Editor",
    description: "Manage and publish all content. No user or settings access.",
    permissions: ALL.filter((p) => !["user.manage", "settings.write"].includes(p)),
  },
  AUTHOR: {
    name: "Author",
    description: "Write drafts for articles and projects. Cannot publish or delete.",
    permissions: [
      "dashboard.view",
      "page.read",
      "project.read",
      "project.write",
      "service.read",
      "article.read",
      "article.write",
      "media.read",
      "media.write",
    ],
  },
  VIEWER: {
    name: "Viewer",
    description: "Read-only access to the admin.",
    permissions: ALL.filter((p) => p.endsWith(".read") || p === "dashboard.view"),
  },
};
